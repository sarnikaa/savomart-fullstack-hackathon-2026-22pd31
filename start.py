import subprocess
import sys
import time
import os
import signal

def main():
    print("=" * 65)
    print("  SAVOMART SITESCOUT: EXPANSION INTELLIGENCE PLATFORM (CHENNAI)")
    print("=" * 65)
    print("[1/2] Launching FastAPI Backend on http://localhost:8000 ...")

    # Launch Backend
    backend_proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"],
        cwd=os.path.dirname(os.path.abspath(__file__))
    )

    time.sleep(2)

    print("[2/2] Launching React Vite Frontend on http://localhost:5173 ...")
    # Launch Frontend (npm run dev)
    frontend_cwd = os.path.join(os.path.dirname(os.path.abspath(__file__)), "frontend")
    npm_cmd = "npm.cmd" if sys.platform == "win32" else "npm"
    frontend_proc = subprocess.Popen(
        [npm_cmd, "run", "dev"],
        cwd=frontend_cwd
    )

    print("\n" + "=" * 65)
    print("  PLATFORM ONLINE!")
    print("  - Web UI: http://localhost:5173")
    print("  - API & Swagger Docs: http://localhost:8000/docs")
    print("  - Press Ctrl+C to terminate both servers")
    print("=" * 65 + "\n")

    try:
        backend_proc.wait()
        frontend_proc.wait()
    except KeyboardInterrupt:
        print("\nStopping Savo SiteScout servers...")
        backend_proc.terminate()
        frontend_proc.terminate()
        print("Servers stopped.")

if __name__ == "__main__":
    main()
