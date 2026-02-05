Rails.application.config.assets.version = "1.0"
Rails.application.config.assets.paths << Rails.root.join("node_modules")
Rails.application.config.assets.paths << Rails.root.join("app/javascript")
Rails.application.config.assets.paths << Rails.root.join("app/assets/builds")
Rails.application.config.assets.precompile += %w[application.js controllers/application.js controllers/index.js]
Rails.application.config.assets.precompile += %w[inter-font.css application.css tailwind.css]
