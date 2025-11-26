from google.adk.agents.callback_context import CallbackContext
import logging


logger = logging.getLogger(__name__)

async def save_memory_callback(callback_context: CallbackContext):
    ctx = callback_context._invocation_context
    session = getattr(ctx, "session", None)
    memory = getattr(ctx, "memory_service", None)
    if session and memory:
        try:
            await memory.add_session_to_memory(session)
            logger.info(f"[MEM] 메모리 저장 완료")

        except Exception as e:
            logger.info(f"[ERR] 메모리 저장 중 에러 발생: {e}")
            pass
    return None

# --- get tools ---
def get_callback_tools():
    tools = []
    tools.append(save_memory_callback)
    return tools