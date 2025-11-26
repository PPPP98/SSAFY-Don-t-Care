# tools
from datetime import datetime
from zoneinfo import ZoneInfo
from google.adk.tools.preload_memory_tool import PreloadMemoryTool

# google adk
from google.adk.tools.agent_tool import AgentTool

# sub agents
from ..sub_agents.financial_analyst.agent import financial_analyst_agent
from ..sub_agents.market_analyst.agent import market_analyst_agent
from ..sub_agents.news_analyst.agent import news_analyst_agent
from ..sub_agents.risk_analyst.agent import risk_analyst_agent


# --- time zone tool ---
async def tool_now_kst(dummy: str = ""):
    """
    Get the current time in Korea Standard Time (KST).
    """
    now = datetime.now(ZoneInfo("Asia/Seoul"))
    return {
        "today": now.strftime("%Y-%m-%d"),
        "datetime": now.isoformat(),
        "year": now.year,
        "month": now.month,
        "day": now.day,
        "last_completed_fiscal_year": now.year - 1,
    }


# --- get tools ---
def get_tools():
    tools = []
    tools.append(AgentTool(financial_analyst_agent))
    tools.append(AgentTool(news_analyst_agent))
    tools.append(AgentTool(market_analyst_agent))
    tools.append(AgentTool(risk_analyst_agent))
    tools.append(tool_now_kst)
    tools.append(PreloadMemoryTool())
    return tools
