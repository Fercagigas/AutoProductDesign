from langgraph.graph import StateGraph, END
from src.state import GraphState
from src.agents.orchestrator import orchestrator_node
from src.agents.debaters import debater_node
from src.agents.scribe import scribe_node
from langchain_core.messages import HumanMessage, AIMessage

def human_review_node(state: GraphState):
    """
    This node doesn't do much itself, but serves as a breakpoint.
    The graph execution will pause before this node if configured,
    allowing the user to inject feedback into the state.
    """
    print("--- HUMAN REVIEW NODE ---")
    print("Please provide your feedback based on the debate so far.")
    # We can inject a placeholder message or just return state
    return {"messages": [AIMessage(content="Waiting for user feedback...")]}

def route_orchestrator(state: GraphState):
    if state.get("project_vision"):
        return "debater"
    return "orchestrator"

def route_debater(state: GraphState):
    iteration = state.get("iteration_count", 0)
    
    # Logic: 3 iterations -> Human Review -> Resume
    # Total 9 iterations (3 blocks of 3).
    
    if iteration >= 9:
        return "scribe"
        
    if iteration > 0 and iteration % 3 == 0:
        return "human_review"
        
    return "debater"

def build_graph():
    workflow = StateGraph(GraphState)
    
    # Add Nodes
    workflow.add_node("orchestrator", orchestrator_node)
    workflow.add_node("debater", debater_node)
    workflow.add_node("human_review", human_review_node)
    workflow.add_node("scribe", scribe_node)
    
    # Set Entry Point
    workflow.set_entry_point("orchestrator")
    
    # Add Edges
    workflow.add_conditional_edges(
        "orchestrator",
        route_orchestrator,
        {
            "debater": "debater",
            "orchestrator": "orchestrator"
        }
    )
    
    workflow.add_conditional_edges(
        "debater",
        route_debater,
        {
            "human_review": "human_review",
            "debater": "debater",
            "scribe": "scribe"
        }
    )
    
    # From human_review, we go back to debate
    workflow.add_edge("human_review", "debater")
    
    # From Scribe to END
    workflow.add_edge("scribe", END)
    
    
    # Compile with interruption and checkpointer
    from langgraph.checkpoint.memory import MemorySaver
    checkpointer = MemorySaver()
    app = workflow.compile(
        interrupt_before=["human_review"], 
        checkpointer=checkpointer
    )
    
    return app
