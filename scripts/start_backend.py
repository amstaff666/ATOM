#!/usr/bin/env python3
"""
ATOM Platform Backend Startup Script - Fixed Version
"""

import os
import sys
import time
import signal
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BACKEND_DIR = ROOT / "backend"

def run_self_heal():
    """Run platform self-heal before backend startup."""
    heal_script = Path(__file__).parent / "atom_self_heal.py"
    if not heal_script.exists():
        return True
    print("🔧 Running Atom self-heal...")
    result = subprocess.run(
        [sys.executable, str(heal_script), "--max-rounds", "2", "-q"],
        cwd=str(Path(__file__).parent.parent),
    )
    if result.returncode != 0:
        print("⚠️  Self-heal reported issues (continuing startup)")
    return True


def check_python_version():
    """Check if Python version is compatible"""
    if sys.version_info < (3, 8):
        print("❌ Python 3.8 or higher is required")
        print(f"   Current version: {sys.version}")
        return False
    print(f"✅ Python version: {sys.version.split()[0]}")
    return True

def check_required_packages():
    """Check if required packages are installed"""
    required_packages = [
        'fastapi',
        'uvicorn', 
        'requests',
        'pydantic'
    ]
    
    missing_packages = []
    for package in required_packages:
        try:
            __import__(package)
        except ImportError:
            missing_packages.append(package)
    
    if missing_packages:
        print("❌ Missing required packages:")
        for package in missing_packages:
            print(f"   - {package}")
        print("\nInstall with: pip install fastapi uvicorn requests pydantic")
        return False
    
    print("✅ Required packages installed")
    return True

def load_env_files():
    """Load project .env before applying dev defaults."""
    try:
        from dotenv import load_dotenv
        load_dotenv(ROOT / ".env", override=False)
        load_dotenv(BACKEND_DIR / ".env", override=False)
    except ImportError:
        pass
    return True


def check_environment():
    """Check environment variables"""
    load_env_files()
    env_vars = {
        'DATABASE_URL': 'sqlite:///atom_data.db',
        'SECRET_KEY': 'atom-dev-secret-key',
        'DEBUG': 'true',
        'ALLOW_DEV_TEMP_USERS': 'true',
        'ENVIRONMENT': 'development',
    }
    
    for var, default in env_vars.items():
        if not os.getenv(var):
            os.environ[var] = default
    
    print("✅ Environment variables configured")
    return True

def setup_directories():
    """Create necessary directories"""
    directories = [
        './data',
        './data/atom_memory', 
        './logs',
        './temp'
    ]
    
    for directory in directories:
        Path(directory).mkdir(parents=True, exist_ok=True)
    
    print("✅ Directories created")
    return True

def check_backend_file():
    """Check if main backend file exists"""
    backend_file = './backend/main_api_app.py'
    if not Path(backend_file).exists():
        print(f"❌ Backend file not found: {backend_file}")
        return False
    print("✅ Backend file found")
    return True

def start_backend():
    """Start backend server"""
    print("\n🚀 Starting ATOM Backend...")
    
    os.chdir(BACKEND_DIR)
    backend_path = str(BACKEND_DIR)
    if backend_path not in sys.path:
        sys.path.insert(0, backend_path)
    print(f"📍 Changed to directory: {os.getcwd()}")
    
    try:
        import uvicorn
        from main_api_app import app
        
        # Configuration
        host = os.getenv('HOST', '127.0.0.1')
        port = int(os.getenv('PORT', '4490'))
        debug = os.getenv('DEBUG', 'false').lower() == 'true'
        
        print(f"   Host: {host}")
        print(f"   Port: {port}")
        print(f"   Debug: {debug}")
        
        # Start server
        config = uvicorn.Config(
            app=app,
            host=host,
            port=port,
            log_level="info" if not debug else "debug",
            reload=debug
        )
        
        server = uvicorn.Server(config)
        
        # Setup signal handlers
        def signal_handler(sig, frame):
            print("\n🛑 Shutting down backend...")
            server.should_exit = True
        
        signal.signal(signal.SIGINT, signal_handler)
        signal.signal(signal.SIGTERM, signal_handler)
        
        print(f"✅ Backend starting at http://{host}:{port}")
        print("   API Documentation: http://{host}:{port}/docs")
        print("   Press Ctrl+C to stop")
        
        server.run()
        
    except ImportError as e:
        print(f"❌ Failed to import backend: {e}")
        return False
    except Exception as e:
        print(f"❌ Failed to start backend: {e}")
        return False
    
    return True

def main():
    """Main startup function"""
    print("🌟 ATOM Platform Backend Starting...")

    run_self_heal()
    
    # Pre-startup checks
    checks = [
        ("Python Version", check_python_version),
        ("Required Packages", check_required_packages),
        ("Environment", check_environment),
        ("Directories", setup_directories),
        ("Backend File", check_backend_file)
    ]
    
    all_passed = True
    for check_name, check_func in checks:
        print(f"\n🔍 Checking {check_name}...")
        if not check_func():
            all_passed = False
            break
    
    if not all_passed:
        print("\n❌ Startup checks failed. Please fix issues above.")
        sys.exit(1)
    
    # Show startup info
    print("\n🔧 ATOM Platform Backend")
    print("=" * 40)
    print("📍 Current Directory: {}".format(os.getcwd()))
    print("🐍 Python Path: {}".format(sys.executable))
    
    # Start backend
    if not start_backend():
        print("\n❌ Backend startup failed.")
        sys.exit(1)
    
    print("\n✅ Backend stopped gracefully.")

if __name__ == "__main__":
    main()