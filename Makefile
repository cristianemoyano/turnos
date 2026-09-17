.PHONY: prod-init prod-build prod-deploy prod-migrate prod-ssl prod-nginx-http prod-health prod-ship prod-setup-cap

prod-init:
	bash infra/scripts/init.sh

prod-nginx-http:
	bash infra/scripts/install-nginx-http.sh

prod-ssl:
	bash infra/scripts/expand-ssl.sh

prod-setup-cap:
	bash infra/scripts/setup-cap-site.sh

prod-build:
	TAG=$(TAG) bash infra/scripts/build.sh

prod-deploy:
	TAG=$(TAG) bash infra/scripts/deploy.sh

prod-migrate:
	TAG=$(TAG) bash infra/scripts/migrate.sh $(or $(CMD),up)

prod-health:
	bash infra/scripts/health.sh

prod-ship:
	TAG=$(TAG) SCOPE=$(or $(SCOPE),app) bash infra/scripts/ship.sh
