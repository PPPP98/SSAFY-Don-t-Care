from google.adk.agents import Agent
# tools
from .tools.tools import get_tools
# prompts
from . import prompts 
# --- Setup environment variables and load .env file ---
from ... import config

# tools
tools = get_tools()

financial_analyst_agent = Agent(
    name="financial_analyst_agent",
    model=config.GPT,
    instruction=prompts.FINANCIAL_ANALYST_AGENT,
    description=prompts.DESCRIPTION,
    tools=tools,
    output_key="financial_agent_output",
)
