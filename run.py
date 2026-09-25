import os
import uvicorn

if __name__ == "__main__":
    # Get PORT assigned by Render/Railway environment, default to 8000 locally
    port = int(os.getenv("PORT", 8000))
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",  # Bind to 0.0.0.0 for cloud host detection
        port=port,
        reload=False,     # Disable reloader in production deployment
        log_level="info"
    )