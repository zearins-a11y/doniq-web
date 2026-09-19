-- AI Resumo: adicionar campos de resumo narrativo, email cliente e próximas perguntas
ALTER TABLE relatos ADD COLUMN resumo_narrativo TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE relatos ADD COLUMN email_cliente TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE relatos ADD COLUMN proximas_perguntas TEXT NOT NULL DEFAULT '[]';
