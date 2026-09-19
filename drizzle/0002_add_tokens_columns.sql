-- Adiciona colunas de uso de tokens por extração LLM.
-- Permite auditar custo por relato e otimizar prompts.
ALTER TABLE `relatos` ADD COLUMN `tokens_input` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `relatos` ADD COLUMN `tokens_output` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `relatos` ADD COLUMN `duracao_ms` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `relatos` ADD COLUMN `cache_key` text DEFAULT '' NOT NULL;
