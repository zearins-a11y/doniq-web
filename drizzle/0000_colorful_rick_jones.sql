CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `account_userId_idx` ON `account` (`user_id`);--> statement-breakpoint
CREATE TABLE `compromissos` (
	`compromisso_id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`empresa` text DEFAULT '' NOT NULL,
	`contato` text DEFAULT '' NOT NULL,
	`telefone` text DEFAULT '' NOT NULL,
	`objetivo` text DEFAULT '' NOT NULL,
	`endereco` text DEFAULT '' NOT NULL,
	`data_iso` text DEFAULT '' NOT NULL,
	`hora` text DEFAULT '' NOT NULL,
	`minutos` integer DEFAULT 60 NOT NULL,
	`status` text DEFAULT 'aberto' NOT NULL,
	`relato_id` text DEFAULT '' NOT NULL,
	`criado_em` text NOT NULL,
	`atualizado_em` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `compromissos_user_data_idx` ON `compromissos` (`user_id`,`data_iso`);--> statement-breakpoint
CREATE INDEX `compromissos_user_idx` ON `compromissos` (`user_id`,`criado_em`);--> statement-breakpoint
CREATE TABLE `convites` (
	`convite_id` text PRIMARY KEY NOT NULL,
	`equipe_id` text NOT NULL,
	`email` text NOT NULL,
	`papel` text DEFAULT 'vendedor' NOT NULL,
	`token_hash` text NOT NULL,
	`status` text DEFAULT 'pendente' NOT NULL,
	`criado_por` text NOT NULL,
	`criado_em` text NOT NULL,
	`expira_em` text NOT NULL,
	`aceito_em` text DEFAULT '' NOT NULL,
	`email_enviado` text DEFAULT 'nao' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `convites_token_idx` ON `convites` (`token_hash`);--> statement-breakpoint
CREATE INDEX `convites_equipe_idx` ON `convites` (`equipe_id`);--> statement-breakpoint
CREATE INDEX `convites_email_idx` ON `convites` (`email`);--> statement-breakpoint
CREATE TABLE `equipes` (
	`equipe_id` text PRIMARY KEY NOT NULL,
	`nome` text DEFAULT '' NOT NULL,
	`dono_user_id` text NOT NULL,
	`criado_em` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `equipes_dono_idx` ON `equipes` (`dono_user_id`);--> statement-breakpoint
CREATE TABLE `feeds_agenda` (
	`token` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`ultimo_acesso_em` text DEFAULT '' NOT NULL,
	`acessos` integer DEFAULT 0 NOT NULL,
	`criado_em` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `feeds_agenda_user_idx` ON `feeds_agenda` (`user_id`);--> statement-breakpoint
CREATE TABLE `integracoes` (
	`integracao_id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`provedor` text NOT NULL,
	`credenciais` text NOT NULL,
	`mapa_campos` text DEFAULT '{}' NOT NULL,
	`funil_id` text DEFAULT '' NOT NULL,
	`etapa_id` text DEFAULT '' NOT NULL,
	`ativa` integer DEFAULT true NOT NULL,
	`ultimo_teste_em` text DEFAULT '' NOT NULL,
	`ultimo_teste_ok` integer DEFAULT false NOT NULL,
	`ultimo_teste_erro` text DEFAULT '' NOT NULL,
	`criado_em` text NOT NULL,
	`atualizado_em` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `integracoes_user_provedor_idx` ON `integracoes` (`user_id`,`provedor`);--> statement-breakpoint
CREATE INDEX `integracoes_user_idx` ON `integracoes` (`user_id`);--> statement-breakpoint
CREATE TABLE `membros` (
	`membro_id` text PRIMARY KEY NOT NULL,
	`equipe_id` text NOT NULL,
	`user_id` text NOT NULL,
	`papel` text DEFAULT 'vendedor' NOT NULL,
	`entrou_em` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `membros_user_idx` ON `membros` (`user_id`);--> statement-breakpoint
CREATE INDEX `membros_equipe_idx` ON `membros` (`equipe_id`);--> statement-breakpoint
CREATE TABLE `relatos` (
	`relato_id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`client_id` text,
	`transcricao` text NOT NULL,
	`empresa` text DEFAULT '' NOT NULL,
	`contato` text DEFAULT '' NOT NULL,
	`cargo` text DEFAULT '' NOT NULL,
	`telefone` text DEFAULT '' NOT NULL,
	`resumo` text DEFAULT '' NOT NULL,
	`objecao` text DEFAULT '' NOT NULL,
	`proxima_acao` text DEFAULT '' NOT NULL,
	`data_iso` text DEFAULT '' NOT NULL,
	`hora` text DEFAULT '' NOT NULL,
	`temperatura` text DEFAULT 'morna' NOT NULL,
	`faltou_perguntar` text DEFAULT '[]' NOT NULL,
	`followup` text DEFAULT '' NOT NULL,
	`precisa_confirmar` integer DEFAULT false NOT NULL,
	`campo_a_confirmar` text DEFAULT '' NOT NULL,
	`audio_ininteligivel` integer DEFAULT false NOT NULL,
	`tags` text DEFAULT '[]' NOT NULL,
	`concorrentes` text DEFAULT '[]' NOT NULL,
	`numeros` text DEFAULT '[]' NOT NULL,
	`evidencia` text DEFAULT '{}' NOT NULL,
	`confianca` text DEFAULT '{}' NOT NULL,
	`revisado` integer DEFAULT false NOT NULL,
	`campos_a_revisar` text DEFAULT '[]' NOT NULL,
	`tipo_visita` text DEFAULT 'prospeccao' NOT NULL,
	`roteiro` text DEFAULT '[]' NOT NULL,
	`prompt_versao` text DEFAULT '' NOT NULL,
	`modelo` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `relatos_user_created_idx` ON `relatos` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `relatos_user_data_idx` ON `relatos` (`user_id`,`data_iso`);--> statement-breakpoint
CREATE INDEX `relatos_data_idx` ON `relatos` (`data_iso`);--> statement-breakpoint
CREATE INDEX `relatos_user_client_idx` ON `relatos` (`user_id`,`client_id`);--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE INDEX `session_userId_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`token` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`created_at` text NOT NULL,
	`expires_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `sessions_user_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE TABLE `sincronizacoes` (
	`sincronizacao_id` text PRIMARY KEY NOT NULL,
	`relato_id` text NOT NULL,
	`user_id` text NOT NULL,
	`provedor` text NOT NULL,
	`status` text DEFAULT 'pendente' NOT NULL,
	`tentativas` integer DEFAULT 0 NOT NULL,
	`id_externo` text DEFAULT '{}' NOT NULL,
	`erro` text DEFAULT '' NOT NULL,
	`payload_enviado` text,
	`criado_em` text NOT NULL,
	`atualizado_em` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sincronizacoes_relato_provedor_idx` ON `sincronizacoes` (`relato_id`,`provedor`);--> statement-breakpoint
CREATE INDEX `sincronizacoes_user_idx` ON `sincronizacoes` (`user_id`,`criado_em`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `users` (
	`user_id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`nome` text DEFAULT '' NOT NULL,
	`produto` text DEFAULT '' NOT NULL,
	`vertical` text DEFAULT 'geral' NOT NULL,
	`criado_em` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_idx` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);