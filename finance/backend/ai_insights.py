"""AI-powered expense optimization suggestions via Claude."""
import json
import os
import anthropic


def get_optimization_suggestions(
    expenses_by_category: dict,
    monthly_trends: dict,
    recurring: list,
    top_merchants: list,
) -> str:
    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

    summary = {
        "spese_per_categoria": expenses_by_category,
        "trend_mensili_eur": monthly_trends,
        "spese_ricorrenti_top5": recurring[:5],
        "top_merchants": top_merchants[:10],
    }

    message = client.messages.create(
        model="claude-opus-4-8",
        max_tokens=1024,
        messages=[
            {
                "role": "user",
                "content": (
                    "Analizza questi dati di spesa e fornisci 5-7 suggerimenti concreti e specifici "
                    "per ottimizzare i costi. Per ogni suggerimento indica:\n"
                    "- Categoria interessata\n"
                    "- Risparmio stimato mensile in €\n"
                    "- Azione concreta da intraprendere\n\n"
                    "Rispondi in italiano, in formato JSON con array 'suggerimenti' dove ogni elemento ha: "
                    "'categoria', 'risparmio_mensile_eur', 'azione', 'priorita' (alta/media/bassa).\n\n"
                    f"Dati:\n{json.dumps(summary, ensure_ascii=False, indent=2)}"
                ),
            }
        ],
    )

    text = message.content[0].text
    # extract JSON if wrapped in markdown
    if "```json" in text:
        text = text.split("```json")[1].split("```")[0].strip()
    elif "```" in text:
        text = text.split("```")[1].split("```")[0].strip()

    return json.loads(text)
