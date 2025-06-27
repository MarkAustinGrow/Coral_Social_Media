Fresh Setup Instructions for Coral Social Media (Testing Setup Wizard)



1\. Prepare a Clean Folder
Navigate to a fresh directory (e.g., E:\\Plank\_pushers\\test1):

cd E:\\Plank\_pushers\\test1



2\. Clone the cleared-cache branch from GitHub
git clone --single-branch --branch cleared-cache https://github.com/MarkAustinGrow/Coral\_Social\_Media.git
cd Coral\_Social\_Media



3\. Create and Activate Python Virtual Environment
python -m venv venv
venv\\Scripts\\activate



4\. Install Python Dependencies
Make sure you're using the clean/fixed requirements.txt:

pip install -r requirements.txt



5\. Optional: Confirm .env is missing
Ensure there's no .env file in the root to trigger the setup wizard:

dir .env
If a file exists, delete it:

del .env



6\. Install Node.js Dependencies for Web Interface

cd Web\_Interface
npm install --legacy-peer-deps



7\. Start the Development Server
npm run dev



8\. Open the App in Browser
Visit:

arduino
Copy
Edit
http://localhost:3000
Scroll down to the bottom of the dashboard for the setup wizard.



Expected "Clean State" Indicators
App asks you to enter your API keys and settings manually.

No pre-filled system config or persona values.

No agents are active until you configure and start them.

.env gets created after wizard completion (you can verify by checking the project root).
Copy the SQL query and paste it into Supabase SQL query editor to configure the database.

