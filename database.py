from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime

Base = declarative_base()

class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True)
    username = Column(String(50), unique=True, nullable=False)
    email = Column(String(120), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(100), default='')
    role = Column(String(30), default='developer') # developer, admin, architect
    created_at = Column(DateTime, default=datetime.utcnow)

    projects = relationship('Project', back_populates='owner')

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

class Project(Base):
    __tablename__ = 'projects'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    technology = Column(String(50))
    framework = Column(String(50))
    database = Column(String(50))
    requirements = Column(Text)
    status = Column(String(20), default='PENDING') # PENDING, BUILDING, TESTING, COMPLETED, FAILED
    created_at = Column(DateTime, default=datetime.utcnow)
    
    owner = relationship('User', back_populates='projects')
    tasks = relationship('Task', backref='project', cascade='all, delete-orphan')
    logs = relationship('Log', backref='project', cascade='all, delete-orphan')
    test_results = relationship('TestResult', backref='project', cascade='all, delete-orphan')

class Task(Base):
    __tablename__ = 'tasks'
    id = Column(Integer, primary_key=True)
    project_id = Column(Integer, ForeignKey('projects.id'))
    task_name = Column(String(200))
    agent = Column(String(50))
    status = Column(String(20), default='PENDING') # PENDING, RUNNING, COMPLETED, FAILED
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime)
    
class Log(Base):
    __tablename__ = 'logs'
    id = Column(Integer, primary_key=True)
    project_id = Column(Integer, ForeignKey('projects.id'))
    level = Column(String(20)) # INFO, ERROR, WARNING, DEBUG
    component = Column(String(50))
    message = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    
class TestResult(Base):
    __tablename__ = 'test_results'
    id = Column(Integer, primary_key=True)
    project_id = Column(Integer, ForeignKey('projects.id'))
    test_name = Column(String(200))
    status = Column(String(20)) # PASS, FAIL
    error_message = Column(Text)
    duration = Column(String(20))

engine = create_engine('sqlite:///devagent.db', connect_args={'check_same_thread': False})
SessionLocal = sessionmaker(bind=engine)

def init_db():
    Base.metadata.create_all(engine)
    
    session = SessionLocal()
    
    # Seed default users if empty
    default_user = session.query(User).filter_by(username='developer').first()
    if not default_user:
        default_user = User(
            username='developer',
            email='dev@devagent.io',
            full_name='Lead Engineer',
            role='developer'
        )
        default_user.set_password('password123')
        session.add(default_user)

        admin_user = User(
            username='admin',
            email='admin@devagent.io',
            full_name='System Admin',
            role='admin'
        )
        admin_user.set_password('admin123')
        session.add(admin_user)
        session.commit()

    # Seed sample project if db is empty
    if session.query(Project).count() == 0:
        demo = Project(
            user_id=default_user.id if default_user else None,
            name='Student Management API (DEMO PROJECT)',
            description='A production-ready REST API for managing student records, course enrollments, and academic grading.',
            technology='Python',
            framework='Flask',
            database='SQLite',
            requirements='1. Create Student record\n2. Query Student profile and grade history\n3. Update enrollment records\n4. Delete inactive records\n5. Generate JSON analytics report',
            status='COMPLETED'
        )
        session.add(demo)
        session.commit()
        
        # Add sample tasks
        tasks = [
            Task(project_id=demo.id, task_name='Analyze requirements and specifications', agent='Requirement Agent', status='COMPLETED'),
            Task(project_id=demo.id, task_name='Synthesize sprint execution plan and dependency tree', agent='Planning Agent', status='COMPLETED'),
            Task(project_id=demo.id, task_name='Design modular architecture and schemas', agent='Architecture Agent', status='COMPLETED'),
            Task(project_id=demo.id, task_name='Generate clean, type-hinted source code', agent='Coding Agent', status='COMPLETED'),
            Task(project_id=demo.id, task_name='Run automated unit and integration tests', agent='Testing Agent', status='COMPLETED'),
            Task(project_id=demo.id, task_name='Execute automated security and bug audit', agent='Code Review Agent', status='COMPLETED'),
            Task(project_id=demo.id, task_name='Compile API markdown documentation', agent='Documentation Agent', status='COMPLETED')
        ]
        session.add_all(tasks)
        
        # Add sample logs
        logs = [
            Log(project_id=demo.id, level='INFO', component='Orchestrator', message='Initialized project workspace at generated_projects/project_1'),
            Log(project_id=demo.id, level='INFO', component='RequirementAgent', message='Parsed 5 core functional requirements with zero ambiguities'),
            Log(project_id=demo.id, level='INFO', component='CodingAgent', message='Generated app.py, models.py, and routes/student_api.py'),
            Log(project_id=demo.id, level='INFO', component='TestingAgent', message='Executing test suite via simulated runner...'),
            Log(project_id=demo.id, level='INFO', component='DocumentationAgent', message='Exported swagger-compatible API doc to docs/api_reference.md')
        ]
        session.add_all(logs)

        # Add sample tests
        tests = [
            TestResult(project_id=demo.id, test_name='test_create_student_valid_payload', status='PASS', duration='0.12 sec', error_message=''),
            TestResult(project_id=demo.id, test_name='test_get_student_by_id', status='PASS', duration='0.08 sec', error_message=''),
            TestResult(project_id=demo.id, test_name='test_update_student_grades', status='PASS', duration='0.15 sec', error_message=''),
            TestResult(project_id=demo.id, test_name='test_delete_student_cascade', status='PASS', duration='0.11 sec', error_message='')
        ]
        session.add_all(tests)
        
        session.commit()
    session.close()

def get_db_session():
    return SessionLocal()

# User authentication helper methods in Python
def register_user(username, email, password, full_name='', role='developer'):
    session = SessionLocal()
    try:
        if session.query(User).filter((User.username == username) | (User.email == email)).first():
            return None, 'Username or Email already registered'
        
        new_user = User(
            username=username.strip().lower(),
            email=email.strip().lower(),
            full_name=full_name.strip(),
            role=role
        )
        new_user.set_password(password)
        session.add(new_user)
        session.commit()
        user_data = {
            'id': new_user.id,
            'username': new_user.username,
            'email': new_user.email,
            'full_name': new_user.full_name,
            'role': new_user.role
        }
        return user_data, None
    except Exception as e:
        session.rollback()
        return None, str(e)
    finally:
        session.close()

def authenticate_user(identifier, password):
    session = SessionLocal()
    try:
        identifier = identifier.strip().lower()
        user = session.query(User).filter((User.username == identifier) | (User.email == identifier)).first()
        if not user or not user.check_password(password):
            return None, 'Invalid username/email or password'
        user_data = {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'full_name': user.full_name,
            'role': user.role
        }
        return user_data, None
    finally:
        session.close()

def get_user_by_id(user_id):
    session = SessionLocal()
    try:
        user = session.query(User).get(user_id)
        if not user:
            return None
        return {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'full_name': user.full_name,
            'role': user.role
        }
    finally:
        session.close()
