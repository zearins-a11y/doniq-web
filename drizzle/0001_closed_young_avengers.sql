CREATE TABLE `lista_espera` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`segmento` text DEFAULT '' NOT NULL,
	`criado_em` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `lista_espera_email_idx` ON `lista_espera` (`email`);