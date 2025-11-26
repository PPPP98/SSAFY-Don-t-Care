from google.adk.agents import Agent

# tools
from .tools.tools import get_tools

# prompts
from . import prompts
# --- Setup environment variables and load .env file ---
from ... import config

# --- get tools ---
tools = get_tools()

news_analyst_agent = Agent(
    name="news_analyst_agent",
    model=config.GEMINI,
    instruction=prompts.NEWS_ANALYST_AGENT,
    description=prompts.DESCRIPTION,
    tools=tools,
    output_key="new_search_agent_output",
)