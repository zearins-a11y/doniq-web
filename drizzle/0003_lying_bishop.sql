CREATE TABLE `criacoes_relato` (
	`criacao_id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`client_id` text NOT NULL,
	`relato_id` text NOT NULL,
	`status` text DEFAULT 'processando' NOT NULL,
	`claim_token` text NOT NULL,
	`claim_expira_em` text NOT NULL,
	`erro` text DEFAULT '' NOT NULL,
	`criado_em` text NOT NULL,
	`atualizado_em` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `criacoes_relato_user_client_idx` ON `criacoes_relato` (`user_id`,`client_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `criacoes_relato_relato_idx` ON `criacoes_relato` (`relato_id`);--> statement-breakpoint
ALTER TABLE `sincronizacoes` ADD `claim_token` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `sincronizacoes` ADD `claim_expira_em` text DEFAULT '' NOT NULL;
