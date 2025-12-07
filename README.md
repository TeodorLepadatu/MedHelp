# BestEM Challenge - SQUAD CAL

## Overview

Welcome to the **BestEM Challenge** repository. This project is a full-stack **Retrieval-Augmented Generation (RAG)** application designed to answer user queries by retrieving context from a specific knowledge base. 

The system utilizes a pre-computed vector index (`rag_index.pkl`) to find relevant information and processes it through a backend server to generate accurate responses. It includes a Python-based backend, a web frontend, and standalone CLI scripts for testing and deployment.

---

##  Repository Structure

```text
├── backend/            # Source code for the backend API logic
├── frontend/           # Source code for the web-based user interface
├── client.py           # A lightweight Python client for testing the API
├── server.py           # The main entry point for the backend server
├── rag_index.pkl       # Serialized vector store containing the knowledge base
├── start.sh            # Automation script to launch the full application
└── Presentation.pdf    # Project documentation and slides
````

-----

##  Code Explanation

### 1\. `rag_index.pkl`

This is a binary file created using Python's `pickle` module. It serves as the **Knowledge Base** for the RAG system. It contains:

  * **Vector Embeddings:** Numerical representations of documents.
  * **Metadata:** References to the original text chunks.
  * **Index Structure:** (FAISS) enabling fast similarity searches.

### 2\. `server.py`

The core backend logic resides here. Its primary responsibilities are:

  * **Initialization:** Loads the `rag_index.pkl` into memory upon startup.
  * **API Management:** Sets up endpoints (via FastAPI) to listen for incoming HTTP requests.
  * **Retrieval Logic:** When a query is received, it searches the index for the most relevant documents.
  * **Generation:** It combines the user query and the retrieved documents, sends them to an LLM (GPT4 in this case), and returns the generated answer.

### 3\. `client.py`

A utility script used to test the backend without needing the frontend.

  * It establishes a socket or HTTP connection to `server.py`.
  * It sends a test payload (a sample question).
  * It prints the raw response from the server to the console, useful for debugging API latency and payload structure.

### 4\. `start.sh`

A Bash script designed to streamline the deployment process. It automates:

  * Setting up environment variables.
  * Launching the Python backend in the background.
  * Starting the frontend development server.

-----

##  Getting Started

### Prerequisites

Before running the project, ensure you have the following installed:

  * **Python 3.8+**
  * **Node.js & npm** (Required for the frontend)
  * **API Keys:** If the project uses OpenAI, ensure you have your API key ready.

### Installation

1.  **Clone the Repository**

    ```bash
    git clone [https://github.com/TeodorLepadatu/BestEM-challenge.git](https://github.com/TeodorLepadatu/BestEM-challenge.git)
    cd BestEM-challenge
    ```

2.  **Install Backend Dependencies**
    Navigate to the .py files and install the Python requirements.


3.  **Install Frontend Dependencies**

    ```bash
    cd frontend
    npm install
    cd ..
    ```

-----

##  How to Run

### Option 1: Quick Start (Recommended)

Use the provided shell script to spin up the entire environment at once.

```bash
chmod +x start.sh   # Ensure the script is executable
./start.sh
```

### Option 2: Manual Execution

If you prefer to run components individually for debugging:

**1. Start the Backend Server**
Open a terminal and run the server script.

```bash
# Ensure your API key is set if required
export OPENAI_API_KEY="your-api-key-here"

python server.py
```

*Keep this terminal open.*

**2. Test with the Client (Optional)**
Open a second terminal to verify the server is responding correctly.

```bash
python client.py
```

**3. Start the Frontend**
Open a third terminal to launch the web interface.

```bash
cd frontend
npm run dev   # or 'npm start', depending on the package.json scripts
```

Open your browser and navigate to the localhost URL provided (usually `http://localhost:3000` or `http://localhost:5173`).

-----

##  Troubleshooting

  * **`ModuleNotFoundError`**: Run `pip install <missing-package>` (common packages used: `flask`, `fastapi`, `langchain`, `openai`, `numpy`, `pandas`).
  * **Pickle Load Error**: If `rag_index.pkl` fails to load, ensure your Python version matches the version used to create the pickle file.
  * **Connection Refused**: If `client.py` fails, ensure `server.py` is running and that the port numbers in both files match.

<!-- end list -->

```
