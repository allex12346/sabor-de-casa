CREATE TABLE `itens_pedido` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pedido_id` int NOT NULL,
	`produto_id` int NOT NULL,
	`quantidade` int NOT NULL DEFAULT 1,
	`valor_unitario` decimal(10,2) NOT NULL,
	`valor_total` decimal(10,2) NOT NULL,
	`observacao_item` text,
	`data_criacao` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `itens_pedido_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pedidos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`session_id` varchar(128) NOT NULL,
	`nome_cliente` varchar(150) NOT NULL DEFAULT 'Cliente',
	`numero_mesa` varchar(32) NOT NULL DEFAULT '1',
	`observacoes` text,
	`subtotal` decimal(10,2) NOT NULL DEFAULT '0.00',
	`taxa_garcom` decimal(10,2) NOT NULL DEFAULT '0.00',
	`total` decimal(10,2) NOT NULL DEFAULT '0.00',
	`inclui_taxa_garcom` int NOT NULL DEFAULT 1,
	`status` varchar(32) NOT NULL DEFAULT 'aberto',
	`data_criacao` timestamp NOT NULL DEFAULT (now()),
	`data_atualizacao` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pedidos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `produtos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(180) NOT NULL,
	`descricao` text NOT NULL,
	`preco` decimal(10,2) NOT NULL,
	`categoria` varchar(64) NOT NULL,
	`imagem` text,
	`destaque` int NOT NULL DEFAULT 0,
	`ativo` int NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `produtos_id` PRIMARY KEY(`id`)
);
