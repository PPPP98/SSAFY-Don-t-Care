from google.adk.agents import Agent

# tools
from .tools.tools import get_tools

# prompts
from . import prompts
# --- Setup environment variables and load .env file ---
from ... import config

# --- get tools ---
tools = get_tools()

market_analyst_agent = Agent(
    name="market_analyst_agent",
    model=config.GPT,
    instruction=prompts.MARKET_ANALYST_AGENT,
    description=prompts.DESCRIPTION,
    tools=tools,
    output_key="market_analyst_agent_output",
)