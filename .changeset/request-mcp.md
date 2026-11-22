---
'@punica/request-mcp': minor
---

An MCP server for Punica Request. It gives an AI assistant the exact API of the packages installed in the project (`search_api`, `get_api`), the rules of version 3 (`get_guide`), the way from 2.x to 3.0 (`get_migration_guide`) and a checker for the code it writes (`validate_code`): imports that do not exist, the API of 2.x with its replacement in 3.x, middlewares in the wrong order and bodies that are set twice. A project that still has 2.x installed is recognised and not steered into rewriting working code.
