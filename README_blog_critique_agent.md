# Blog Critique Agent

The Blog Critique Agent is responsible for fact-checking and reviewing blog posts for accuracy, quality, and logical consistency. It uses the Perplexity API to perform deep analysis of blog content and provides structured critique reports.

## Overview

This agent:
1. Monitors the blog_posts table for content with review_status='pending_fact_check'
2. Performs comprehensive fact-checking using the Perplexity API
3. Stores critique reports in the blog_critique table
4. Updates blog status to 'approved' or 'rejected' based on the critique

## Key Features

- **Fact Verification**: Validates factual claims in blog posts
- **Continuity Analysis**: Checks for logical flow and consistency
- **Persona-Based Reviews**: Customizes critique tone based on persona settings
- **Structured Reports**: Provides detailed, section-by-section analysis
- **Clear Decisions**: Makes explicit approval/rejection decisions
- **Retry Logic**: Implements robust error handling for API calls

## Database Integration

The agent interacts with the following Supabase tables:

- **blog_posts**: Reads posts with review_status='pending_fact_check' and updates their status
- **blog_critique**: Stores detailed critique reports
- **personas**: Reads persona configuration to customize critique tone

## Tools

The agent provides the following tools:

- **fetch_pending_blogs**: Retrieves blogs that need fact-checking
- **fetch_persona**: Gets the current persona configuration
- **fact_check_blog_with_perplexity**: Performs fact-checking with Perplexity API
- **store_critique_report**: Saves critique and updates blog status
- **list_fact_check_status**: Provides a summary of fact-checking status

## Perplexity and Anthropic Integration

The agent uses the Perplexity API for fact-checking and the Anthropic API for advanced reasoning:

- **Perplexity API**: Used for deep fact-checking with:
  - Comprehensive prompt engineering
  - Robust retry logic with exponential backoff
  - Citation verification and source credibility assessment

- **Anthropic API**: Used for advanced reasoning and analysis with:
  - Logical flow evaluation
  - Argument strength assessment
  - Coherence and consistency checking

Both APIs are integrated with persona-based tone customization and explicit approval/rejection decisions.

## Coral Protocol Integration

The agent integrates with the Coral Protocol to:

- Respond to mentions from other agents
- Process specific fact-checking requests
- Provide status updates when queried

## Usage

To run the agent:

```bash
python 4_langchain_blog_critique_agent.py
```

The agent will automatically:
1. Connect to the Coral Protocol server
2. Wait for mentions or process pending blogs
3. Perform fact-checking and store results
4. Wait 5 minutes between processing blogs (to manage API rate limits)

## Configuration

The agent requires the following environment variables:

- **OPENAI_API_KEY**: For LangChain agent functionality
- **PERPLEXITY_API_KEY**: For fact-checking API access
- **ANTHROPIC_API_KEY**: For advanced reasoning and analysis
- **SUPABASE_URL** and **SUPABASE_KEY**: For database access

These API keys can be configured through the setup wizard in the web interface, which now includes a dedicated "AI Services" tab for Perplexity and Anthropic API keys.

## Setup Wizard Integration

The Blog Critique Agent is now fully integrated with the setup wizard in the web interface:

1. **API Keys Configuration**:
   - The setup wizard now includes a dedicated "AI Services" tab in the API Keys step
   - This tab provides input fields for both Perplexity and Anthropic API keys
   - Each API key has validation and visibility toggle options

2. **Environment Variable Management**:
   - The setup wizard saves the Perplexity and Anthropic API keys to the .env file
   - Keys are stored as PERPLEXITY_API_KEY and ANTHROPIC_API_KEY
   - The agent automatically loads these keys from the environment

3. **Configuration Review**:
   - The Finish step of the setup wizard now shows the status of these API keys
   - Users can review their configuration before completing setup

This integration ensures a smooth setup experience for users and proper configuration of all required API keys for the Blog Critique Agent.

## Error Handling

The agent implements robust error handling:

- Exponential backoff for API retries
- Detailed logging for troubleshooting
- Fallback mechanisms for API failures
- Default rejection on critical errors

## Integration with Other Agents

The Blog Critique Agent fits into the workflow after the Blog Writing Agent:

1. Blog Writing Agent creates blog content
2. Blog posts are marked with review_status='pending_fact_check'
3. Blog Critique Agent performs fact-checking
4. Approved blogs can proceed to the Blog to Tweet Agent

## Customization

The agent's behavior can be customized by:

1. Modifying the persona in the personas table
2. Adjusting the Perplexity prompt in the fact_check_blog_with_perplexity tool
3. Changing the wait time between blog processing (default: 5 minutes)
