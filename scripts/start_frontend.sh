#!/bin/bash
# ATOM Platform Frontend Next.js Startup Script

echo "🌟 ATOM Platform Frontend Starting..."
echo "=================================="

# Self-heal before start
if [ -f "scripts/atom_self_heal.py" ]; then
    echo "🔧 Running self-heal..."
    python3 scripts/atom_self_heal.py --max-rounds 2 -q || true
fi

# Check if we're in the right directory
if [ ! -d "frontend-nextjs" ]; then
    echo "❌ Error: frontend-nextjs directory not found"
    echo "   Please run this script from the atom root directory"
    exit 1
fi

# Change to frontend directory
cd frontend-nextjs

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed"
    echo "   Please install Node.js from https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js version: $(node --version)"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ Error: npm is not installed"
    echo "   Please install npm (comes with Node.js)"
    exit 1
fi

echo "✅ npm version: $(npm --version)"

# Check if package.json exists
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found"
    echo "   Please ensure you're in the correct directory"
    exit 1
fi

echo "✅ package.json found"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Error: Failed to install dependencies"
        exit 1
    fi
    echo "✅ Dependencies installed"
else
    echo "✅ Dependencies already installed"
fi

# Check if .env.local exists, create from .env.example if not
if [ ! -f ".env.local" ] && [ -f ".env.example" ]; then
    echo "📝 Creating .env.local from .env.example..."
    cp .env.example .env.local
    echo "✅ .env.local created"
fi

# Show configuration
echo ""
echo "⚙️  Configuration:"
echo "   Directory: $(pwd)"
echo "   Port: 3000 (default)"
echo "   Environment: ${NODE_ENV:-development}"

# Start the development server
echo ""
echo "🚀 Starting Next.js development server..."
echo "   Frontend will be available at: http://localhost:3000"
echo "   Press Ctrl+C to stop"
echo ""

npm run dev