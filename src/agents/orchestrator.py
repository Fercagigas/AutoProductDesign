from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from src.state import GraphState
from src.utils.llm import get_llm

def orchestrator_node(state: GraphState):
    """
    The Orchestrator Agent's goal is to align with the user on the project vision.
    It asks clarifying questions until it has enough information to form a solid 'Project Vision'.
    """
    print("--- ORCHESTRATOR NODE ---")
    messages = state['messages']
    
    # Simple logic: If we don't have a project vision, we keep asking.
    # For this MVP, we will assume a fixed number of alignment turns or check for a specific flag.
    # In a real scenario, this would be more dynamic.
    
    # Check if we have a vision already
    if state.get("project_vision"):
        return {"messages": [AIMessage(content="Project Vision confirmed. Proceeding to debate.")]}

    llm = get_llm(temperature=0.7)
    
    system_prompt = """You are the Lead Architect and Project Manager. 
    Your goal is to gather a comprehensive "Project Vision" from the user.
    Ask clarifying questions about the project's scope, goals, features, and constraints.
    Do not stop until you have a clear understanding or the user explicitly says "Ready".
    
    If the user has provided enough detail or says they are ready, summarize the project vision starting with "VISION_CONFIRMED:".
    Otherwise, ask the next most important question.
    """
    
    response = llm.invoke([SystemMessage(content=system_prompt)] + messages)
    
    if "VISION_CONFIRMED:" in response.content:
        vision_text = response.content.replace("VISION_CONFIRMED:", "").strip()
        return {
            "messages": [response],
            "project_vision": vision_text
        }
    else:
        return {"messages": [response]}
