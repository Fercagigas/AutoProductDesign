import sys
from src.graph import build_graph
from langchain_core.messages import HumanMessage, AIMessage

def main():
    print("Initializing AutoProductDesign Agent System...")
    app = build_graph()
    
    # Configuration for the thread
    config = {"configurable": {"thread_id": "1"}}
    
    print("System Ready. Please describe your project idea to start.")
    
    # Initial run flag
    first_run = True
    
    while True:
        try:
            # Check state to see if we are interrupted
            snapshot = app.get_state(config)
            
            # If we are paused (next is set), we need input to proceed
            # OR if it's the first run
            
            if first_run or snapshot.next:
                user_input = input("\nUser (q to quit): ")
                if user_input.lower() in ["q", "quit"]:
                    break
                
                # If first run, we stream with initial state
                if first_run:
                    initial_state = {
                        "messages": [HumanMessage(content=user_input)],
                        "iteration_count": 0,
                    }
                    print("\n--- Starting Orchestrator ---")
                    # Use stream to process
                    for event in app.stream(initial_state, config):
                        _print_event(event)
                    first_run = False
                else:
                    # We are resuming from an interrupt (likely human_review or orchestrator if we set it)
                    # We update the state with the user's input as a new message
                    app.update_state(config, {"messages": [HumanMessage(content=user_input)]})
                    
                    print("\n--- Resuming Graph ---")
                    # Resume execution
                    for event in app.stream(None, config):
                         _print_event(event)
            else:
                # If we are not paused, maybe we finished?
                print("Graph execution finished/idle.")
                break
                
        except Exception as e:
            print(f"Error: {e}")
            import traceback
            traceback.print_exc()
            break

def _print_event(event):
    for key, value in event.items():
        print(f"\n> Node: {key}")
        if "messages" in value and value["messages"]:
            last_msg = value["messages"][-1]
            if isinstance(last_msg, AIMessage):
                print(f"Agent: {last_msg.content}")
            elif isinstance(last_msg, HumanMessage):
                print(f"User (State): {last_msg.content}")
        
        # Debater progress
        if key == "debater":
            print(f"Iteration: {value.get('iteration_count', '?')}")
        
        # Scribe Output
        if key == "scribe":
             print("Scribe has generated documentation.")

if __name__ == "__main__":
    main()
