from langchain_core.messages import SystemMessage
from src.state import GraphState
from src.utils.llm import get_llm
import os

def scribe_node(state: GraphState):
    """
    The Scribe node synthesizes all the information from the debates and user feedback 
    into ultra-detailed documentation files.
    """
    print("--- SCRIBE NODE ---")
    
    vision = state.get("project_vision")
    messages = state['messages']
    
    # In a real system, we might parse the entire history more carefully.
    # Here we ask the LLM to generate specific files based on the conversation history.
    
    llm = get_llm(temperature=0.3) # Lower temp for documentation
    
    output_dir = "output"
    os.makedirs(output_dir, exist_ok=True)
    
    doc_types = [
        ("requirements.md", "Functional and Non-functional Requirements"),
        ("architecture.md", "System Architecture, Diagrams (Mermaid), and Tech Stack"),
        ("api_specs.md", "API Endpoints, Data Models, and Protocols"),
        ("implementation_plan.md", "Step-by-step implementation guide")
    ]
    
    generated_files = []
    
    for filename, description in doc_types:
        print(f"Generating {filename}...")
        prompt = f"""
        You are an expert Technical Writer.
        Based on the User Vision and the Debate History, write the {filename}.
        
        Project Vision: {vision}
        Description: {description}
        
        Requirements:
        - Be ultra-detailed.
        - Use professional markdown formatting.
        - Include Mermaid diagrams where appropriate.
        - Cover all edge cases discussed.
        """
        
        # Determine context to send. Sending too much might overflow, 
        # but we need the "AGREED POINTS" from the debates.
        # We'll rely on the LLM's ability to extract from the provided messages.
        
        response = llm.invoke([SystemMessage(content=prompt)] + messages[-10:])
        
        with open(os.path.join(output_dir, filename), "w", encoding="utf-8") as f:
            f.write(response.content)
            
        generated_files.append(filename)
        
    return {
        "messages": [AIMessage(content=f"Documentation generated: {', '.join(generated_files)}")]
    }
