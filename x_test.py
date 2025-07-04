from dotenv import load_dotenv
from pathlib import Path
import os

# Load .env
load_dotenv(dotenv_path=Path(__file__).parent / ".env")

# Print loaded values (DO NOT share them publicly)
print("TWITTER_API_KEY:", os.getenv("TWITTER_API_KEY"))
print("TWITTER_API_SECRET:", os.getenv("TWITTER_API_SECRET"))
print("TWITTER_ACCESS_TOKEN:", os.getenv("TWITTER_ACCESS_TOKEN"))
print("TWITTER_ACCESS_SECRET:", os.getenv("TWITTER_ACCESS_SECRET"))
