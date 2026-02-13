from typing import TypedDict, List, Annotated
import operator
from langchain_core.messages import BaseMessage

class GraphState(TypedDict):
    """
    Represents the state of our graph.
    """
    messages: Annotated[List[BaseMessage], operator.add]
    iteration_count: int
    project_vision: str
    current_debate_topic: str
    draft_specs: dict
    user_feedback: List[str]
