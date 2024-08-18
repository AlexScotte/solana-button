-include .env

.PHONY: node clean build deploy help 

# make :
# 	@echo "Usage:"
# 	@echo "  make run\n    to launch the frontend on localhost\n"
# 	@echo ""

node:
	@solana-test-validator
	# @solana-test-validator -r --bpf-program metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s metadata.so

clean:
	@anchor clean

build:
	@anchor build

deploy:
	@anchor deploy

test:
	@anchor test

init:
	@ts-node migrations/initialize_global_state.ts

game:
	@ts-node migrations/create_game.ts


# solana config set --url devnet