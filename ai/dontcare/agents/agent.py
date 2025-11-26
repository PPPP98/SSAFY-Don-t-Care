from google.adk.agents import Agent

# 도구 모듈 임포트
from .tools.tools import get_tools
from .tools.callback import get_callback_tools

# 프롬프트 모듈 임포트
from . import prompts

# 환경변수 설정 및 .env 파일 로딩
from . import config

# 도구 및 콜백 설정
tools = get_tools()
callback = get_callback_tools()

# 루트 에이전트 정의
root_agent = Agent(
    name="root_agent",
    model=config.GPT,
    instruction=prompts.ROOT_AGENT,
    after_agent_callback=callback,
    tools=tools,
)
