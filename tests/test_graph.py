import sys
import os

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from src.graph import build_graph

def test_graph_compilation():
    print("Testing graph compilation...")
    try:
        app = build_graph()
        print("Graph compiled successfully.")
        
        # Print graph structure
        print("Graph visualization (ascii):")
        print(app.get_graph().draw_ascii())
        
    except Exception as e:
        print(f"FAILED: {e}")
        sys.exit(1)

if __name__ == "__main__":
    test_graph_compilation()
