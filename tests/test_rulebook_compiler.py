import pytest
from app.compiler.expressions import ExpressionEvaluator
from app.compiler.rulebook import RulebookCompiler


def test_expression_evaluator():
    record = {
        "account_ref": "ACC-9901",
        "period_end": "2026-06-30",
        "tax_id": "123-45-6789"
    }

    # Direct substitution
    assert ExpressionEvaluator.evaluate("{{account_ref}}", record) == "ACC-9901"

    # Derived Period Start
    assert ExpressionEvaluator.evaluate("PERIOD_START({{period_end}})", record) == "2026-06-01"

    # Tokenize
    assert ExpressionEvaluator.evaluate("TOKENIZE({{tax_id}})", record) == "TOK-xxx-xx-6789"

    # String Concatenation
    assert ExpressionEvaluator.evaluate("CONCAT(AC-, {{account_ref}})", record) == "AC-ACC-9901"


def test_rulebook_parser():
    markdown = """
# Morningstar Rulebook

## Field transformations

| Entity | Target field | Source file | Expression |
| --- | --- | --- | --- |
| Account | account_id | accounts.csv | {{account_ref}} |

## Value crosswalks

| Source file | Target field | Source value | Target value |
| --- | --- | --- | --- |
| accounts.csv | registration_type | TAX | TAXABLE |
| accounts.csv | registration_type | IRA | IRA |

## Entity joins

| Left file | Left field | Right file | Right field | Join type |
| --- | --- | --- | --- | --- |
| accounts.csv | client_id | clients.csv | client_id | LEFT |

## Validation rules

| Entity | File | Check type | Scope | Rule text |
| --- | --- | --- | --- | --- |
| Account | accounts.csv | REQUIRED | account_id | ID is required |
"""

    parsed = RulebookCompiler.parse_markdown(markdown)

    assert len(parsed["fieldRules"]) == 1
    assert parsed["fieldRules"][0]["targetField"] == "account_id"

    assert len(parsed["crosswalks"]) == 1
    assert parsed["crosswalks"][0]["mappings"]["TAX"] == "TAXABLE"
    assert parsed["crosswalks"][0]["mappings"]["IRA"] == "IRA"

    assert len(parsed["joins"]) == 1
    assert parsed["joins"][0]["leftFile"] == "accounts.csv"

    assert len(parsed["validationRules"]) == 1
    assert parsed["validationRules"][0]["checkType"] == "REQUIRED"


def test_rulebook_precedence_overlay():
    base_br = {
        "fieldRules": [
            {"entity": "Account", "targetField": "account_id", "sourceFile": "base.csv", "expression": "{{old_id}}"}
        ]
    }

    markdown_override = """
## Field transformations

| Entity | Target field | Source file | Expression |
| --- | --- | --- | --- |
| Account | account_id | override.csv | {{new_id}} |
"""

    compiled = RulebookCompiler.compile_rulebook(
        markdown_content=markdown_override,
        base_business_rules=base_br
    )

    # Markdown rule should override base JSON rule
    assert len(compiled["fieldRules"]) == 1
    assert compiled["fieldRules"][0]["sourceFile"] == "override.csv"
    assert compiled["fieldRules"][0]["expression"] == "{{new_id}}"