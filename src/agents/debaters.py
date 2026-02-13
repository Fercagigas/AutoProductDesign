from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from src.state import GraphState
from src.utils.llm import get_llm

def debater_node(state: GraphState):
    """
    The Debater node simulates a discussion between multiple expert personas.
    It takes the Project Vision and the current Iteration Count to drive the conversation.
    """
    print(f"--- DEBATER NODE (Iteration {state.get('iteration_count', 0)}) ---")
    
    vision = state.get("project_vision", "No vision defined.")
    iteration = state.get("iteration_count", 1)
    current_topic = state.get("current_debate_topic", "General Architecture and Requirements")
    
    llm = get_llm(temperature=0.7)
    
    # We simulate a round table discussion.
    # We can rotate topics based on iteration or keep it focused.
    
    system_prompt = f"""You are a panel of expert software consultants debating the implementation of a new project.
    
    Project Vision:
    {vision}
    
    Current Iteration: {iteration}
    Current Topic: {current_topic}
    
    The panel consists of:
    1. **Senior Architect (Tech Lead)**: Focuses on scalability, performance, clean code, and technology choices. Skeptical of "magic" solutions.
    2. **Product Manager**: Focuses on user value, features, usability, and timeline. Wants everthing "now".
    3. **QA Lead**: Focuses on testing strategies, edge cases, and reliability. "How will this break?"
    
    Your goal: Debate the best approach for the current topic. 
    - Critique each other's ideas.
    - Propose concrete solutions.
    - Prepare the groundwork for detailed spec documentation.
    
    Output a transcript of the debate followed by a summary of "AGREED POINTS" and "OPEN QUESTIONS".
    """
    
    # We pass the history so they have context of previous debates
    messages = state['messages'] 
    
    # For the prompt, we might want to summarize history or just pass the last few messages to avoid token limits,
    # but for now, let's pass the context.
    
    response = llm.invoke([SystemMessage(content=system_prompt)] + messages[-5:]) # efficient context window
    
    return {
        "messages": [response],
        "iteration_count": iteration + 1
    }
