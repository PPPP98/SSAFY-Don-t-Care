from google.adk.agents import Agent

# tools
from .tools.tools import get_tools

# prompts
from . import prompts

# --- Setup environment variables and load .env file ---
from ... import config

# --- get tools ---
tools = get_tools()

risk_analyst_agent = Agent(
    name="risk_analyst_anget",
    model=config.GPT,
    instruction=prompts.RISK_ANALYST_AGENT,
    description=prompts.DESCRIPTION,
    tools=tools,
    output_key="risk_analyst_output",
)
