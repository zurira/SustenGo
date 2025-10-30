#![no_std]
use soroban_sdk::{contract, contractimpl, symbol_short, Env, Address, String};
use soroban_token_sdk::Token;

#[contract]
pub struct SustenCoinContract;

#[contractimpl]
impl SustenCoinContract {
    pub fn initialize(
        env: Env,
        admin: Address,
        decimal: u32,
        name: String,
        symbol: String,
    ) {
        Token::initialize(
            &env,
            &admin,
            &decimal,
            &name,
            &symbol,
        );
        env.storage().instance().set(&symbol_short!("FOUND_CANC"), &Address::from_string(&String::from_slice(&env, "GB7N...")));
        env.storage().instance().set(&symbol_short!("MUSEUM_T"), &Address::from_string(&String::from_slice(&env, "GCX5...")));
    }

    pub fn issue_reward(env: Env, to: Address, amount: i128, exp_id: String) {


        Token::mint(&env, &env.current_contract_address(), &to, &amount);
        env.events().publish((symbol_short!("reward"), symbol_short!("issued")), (to, exp_id, amount));
    }

    pub fn burn_for_ticket(env: Env, from: Address, amount: i128, ticket_type: String) {
        from.require_auth();
        
        Token::transfer(&env, &from, &env.current_contract_address(), &amount); 

        env.events().publish((symbol_short!("ticket"), symbol_short!("redeemed")), (from, ticket_type, amount));
    }
    
    pub fn donate(env: Env, from: Address, amount: i128, foundation_key: String) {
        from.require_auth();

        let foundation_address_data = env.storage().instance().get(&foundation_key).unwrap();
        let foundation_address: Address = foundation_address_data;

        Token::transfer(&env, &from, &foundation_address, &amount); 

        env.events().publish((symbol_short!("donate"), symbol_short!("sent")), (from, foundation_address, amount));
    }

    pub fn balance(env: Env, id: Address) -> i128 {
        Token::balance(&env, id)
    }
}