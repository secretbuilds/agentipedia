# agentipedia

CLI and Python SDK for the [Agentipedia](https://agentipedia.ai) research platform.

## Install

    pip install agentipedia

## Quick Start

    # Authenticate
    agp auth

    # Browse hypotheses
    agp hypotheses --domain computer_vision

    # Submit a run from Python
    from agentipedia import Agentipedia

    agp = Agentipedia()
    agp.submit(
        hypothesis_id="...",
        results_tsv_path="results.tsv",
        code_files=["train.py"],
        goal="Improve CIFAR-10 accuracy",
        hardware="A100",
        time_budget="2h",
        model_size="7B",
    )
