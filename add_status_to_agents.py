"""
Script to add status update functionality to all agent files.

This script will:
1. Scan for agent Python files
2. Add the necessary imports and code for status updates
3. Create a backup of the original file
"""

import os
import re
import shutil
import sys

# List of agent files to modify
AGENT_FILES = [
    "3_langchain_tweet_research_agent.py",
    "3.5_langchain_hot_topic_agent.py",
    "4_langchain_blog_critique_agent.py",
    "4_langchain_blog_writing_agent.py",
    "5_langchain_blog_to_tweet_agent.py",
    "6_langchain_x_reply_agent.py",
    "7_langchain_twitter_posting_agent.py"
]

# Map of agent files to their status names in the database
AGENT_NAME_MAP = {
    "3_langchain_tweet_research_agent.py": "Tweet Research Agent",
    "3.5_langchain_hot_topic_agent.py": "Hot Topic Agent",
    "4_langchain_blog_critique_agent.py": "Blog Critique Agent",
    "4_langchain_blog_writing_agent.py": "Blog Writing Agent",
    "5_langchain_blog_to_tweet_agent.py": "Blog to Tweet Agent",
    "6_langchain_x_reply_agent.py": "X Reply Agent",
    "7_langchain_twitter_posting_agent.py": "Twitter Posting Agent"
}

# Code to add at the top of the file (imports)
IMPORTS_CODE = """import signal
import sys
import atexit
import agent_status_updater as asu
"""

# Code to add for agent name constant
def get_agent_name_code(agent_name):
    return f"""
# Agent name for status updates - must match exactly what's in the database
AGENT_NAME = "{agent_name}"

# Register signal handlers for graceful shutdown
def signal_handler(sig, frame):
    \"\"\"Handle Ctrl+C and other signals to gracefully shut down\"\"\"
    print("Shutting down gracefully...")
    asu.mark_agent_stopped(AGENT_NAME)
    sys.exit(0)

# Register signal handlers
signal.signal(signal.SIGINT, signal_handler)  # Ctrl+C
signal.signal(signal.SIGTERM, signal_handler)  # Termination signal

# Register function to mark agent as stopped when the script exits
atexit.register(lambda: asu.mark_agent_stopped(AGENT_NAME))
"""

# Code to add at the beginning of the main function or entry point
MAIN_START_CODE = """    # Mark agent as started
    asu.mark_agent_started(AGENT_NAME)
    
"""

# Code to add for error handling
ERROR_HANDLING_CODE = """    except Exception as e:
        # Report error in status
        asu.report_error(AGENT_NAME, f"Fatal error: {str(e)}")
        
        # Re-raise the exception
        raise
    finally:
        # Mark agent as stopped
        asu.mark_agent_stopped(AGENT_NAME)
"""

def backup_file(file_path):
    """Create a backup of the file"""
    backup_path = file_path + ".bak"
    shutil.copy2(file_path, backup_path)
    print(f"Created backup: {backup_path}")
    return backup_path

def add_imports(content):
    """Add import statements to the file content"""
    # Check if imports already exist
    if "import agent_status_updater as asu" in content:
        print("Status updater imports already exist")
        return content
    
    # Find the last import statement
    import_pattern = re.compile(r'^import .*$|^from .* import .*$', re.MULTILINE)
    matches = list(import_pattern.finditer(content))
    
    if not matches:
        # If no imports found, add at the beginning
        return IMPORTS_CODE + "\n" + content
    
    # Add after the last import
    last_import = matches[-1]
    position = last_import.end()
    return content[:position] + "\n\n" + IMPORTS_CODE + content[position:]

def add_agent_name(content, agent_name):
    """Add agent name constant and signal handlers"""
    # Check if agent name already exists
    if f'AGENT_NAME = "{agent_name}"' in content:
        print("Agent name already exists")
        return content
    
    # Find a good position to add the agent name
    # Look for a line after imports but before any function or class definition
    function_pattern = re.compile(r'^def .*\(.*\):$|^class .*:$', re.MULTILINE)
    matches = list(function_pattern.finditer(content))
    
    if not matches:
        # If no functions or classes found, add after imports
        import_pattern = re.compile(r'^import .*$|^from .* import .*$', re.MULTILINE)
        import_matches = list(import_pattern.finditer(content))
        if not import_matches:
            # If no imports found, add at the beginning
            return get_agent_name_code(agent_name) + "\n" + content
        
        # Add after the last import
        last_import = import_matches[-1]
        position = last_import.end()
        return content[:position] + "\n\n" + get_agent_name_code(agent_name) + content[position:]
    
    # Add before the first function or class
    first_func = matches[0]
    position = first_func.start()
    
    # Find the last blank line before the function
    last_blank = content.rfind("\n\n", 0, position)
    if last_blank != -1:
        position = last_blank + 1
    
    return content[:position] + get_agent_name_code(agent_name) + content[position:]

def add_main_code(content):
    """Add code to the main function or entry point"""
    # Look for if __name__ == "__main__": pattern
    main_pattern = re.compile(r'if\s+__name__\s*==\s*[\'"]__main__[\'"]\s*:', re.MULTILINE)
    match = main_pattern.search(content)
    
    if not match:
        print("WARNING: Could not find main entry point")
        return content
    
    # Find the first line after the if statement
    position = match.end()
    next_line = content.find("\n", position)
    if next_line == -1:
        return content
    
    # Find the indentation level
    indentation = ""
    for char in content[next_line+1:]:
        if char.isspace():
            indentation += char
        else:
            break
    
    # Add the code after the indentation
    main_code = MAIN_START_CODE.replace("    ", indentation)
    return content[:next_line+1] + indentation + main_code + content[next_line+1:]

def add_error_handling(content):
    """Add error handling code to the main function"""
    # Look for if __name__ == "__main__": pattern
    main_pattern = re.compile(r'if\s+__name__\s*==\s*[\'"]__main__[\'"]\s*:', re.MULTILINE)
    match = main_pattern.search(content)
    
    if not match:
        print("WARNING: Could not find main entry point")
        return content
    
    # Find the indentation level
    position = match.end()
    next_line = content.find("\n", position)
    if next_line == -1:
        return content
    
    indentation = ""
    for char in content[next_line+1:]:
        if char.isspace():
            indentation += char
        else:
            break
    
    # Check if there's already a try-except block
    try_pattern = re.compile(r'^\s*try\s*:', re.MULTILINE)
    try_match = try_pattern.search(content, next_line)
    
    if try_match and try_match.start() > next_line:
        # There's a try block, look for the corresponding except block
        except_pattern = re.compile(r'^\s*except\s+.*:', re.MULTILINE)
        except_match = except_pattern.search(content, try_match.end())
        
        if except_match:
            # Look for the end of the except block
            next_indent = re.search(r'^\s*\S', content[except_match.end():], re.MULTILINE)
            if next_indent:
                end_pos = except_match.end() + next_indent.start() - 1
                # Add the finally block
                error_code = ERROR_HANDLING_CODE.replace("    ", indentation)
                return content[:end_pos] + indentation + "finally:\n" + indentation + "    # Mark agent as stopped\n" + indentation + "    asu.mark_agent_stopped(AGENT_NAME)\n" + content[end_pos:]
    
    # If we didn't find a try-except block or couldn't add a finally block,
    # wrap the entire main block in a try-except-finally
    
    # Find the end of the main block
    next_block = re.search(r'^(?!\s)', content[next_line+1:], re.MULTILINE)
    if next_block:
        end_pos = next_line + 1 + next_block.start()
    else:
        end_pos = len(content)
    
    # Extract the main block content
    main_block = content[next_line+1:end_pos]
    
    # Wrap in try-except-finally
    wrapped_block = indentation + "try:\n" + main_block
    
    # Add except and finally blocks
    error_code = ERROR_HANDLING_CODE.replace("    ", indentation)
    wrapped_block += error_code
    
    return content[:next_line+1] + wrapped_block + content[end_pos:]

def add_heartbeat_calls(content):
    """Add heartbeat calls to the main loop"""
    # This is more complex and depends on the structure of each agent
    # For now, we'll just add a comment suggesting manual addition
    print("NOTE: Heartbeat calls need to be added manually to the main loop")
    return content

def add_status_updates(content, agent_name):
    """Add all status update code to the file content"""
    content = add_imports(content)
    content = add_agent_name(content, agent_name)
    content = add_main_code(content)
    content = add_error_handling(content)
    content = add_heartbeat_calls(content)
    return content

def process_file(file_path, agent_name):
    """Process a single agent file"""
    print(f"Processing {file_path}...")
    
    # Create a backup
    backup_file(file_path)
    
    # Read the file
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Add status updates
    modified_content = add_status_updates(content, agent_name)
    
    # Write the modified content back to the file
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(modified_content)
    
    print(f"Updated {file_path} with status update code")

def main():
    """Main function"""
    print("Adding status update code to agent files...")
    
    # Process each agent file
    for agent_file in AGENT_FILES:
        if os.path.exists(agent_file):
            agent_name = AGENT_NAME_MAP.get(agent_file)
            if agent_name:
                process_file(agent_file, agent_name)
            else:
                print(f"WARNING: No agent name mapping for {agent_file}")
        else:
            print(f"WARNING: Agent file not found: {agent_file}")
    
    print("\nDone! Please review the changes and manually add heartbeat calls to the main loops.")
    print("You may also need to make additional adjustments based on each agent's specific structure.")

if __name__ == "__main__":
    main()
