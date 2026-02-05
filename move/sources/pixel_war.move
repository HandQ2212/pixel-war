/// PixelWar - Team-based pixel battle game on Sui
/// Two teams compete to paint the most pixels and win the prize pool
module pixel_war::pixel_war {
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::balance::{Self, Balance};
    use sui::clock::{Self, Clock};
    use sui::event;
    use sui::dynamic_field as df;

    // ====== Constants ======
    const CANVAS_WIDTH: u32 = 50;
    const CANVAS_HEIGHT: u32 = 50;
    const MIN_STAKE: u64 = 1_000_000; // 0.001 SUI
    const GAME_DURATION_MS: u64 = 600_000; // 10 minutes
    
    const POWERUP_SPEED_COST: u64 = 500_000; // 0.0005 SUI
    const POWERUP_BOMB_COST: u64 = 1_000_000; // 0.001 SUI
    const POWERUP_SHIELD_COST: u64 = 1_500_000; // 0.0015 SUI

    // ====== Error Codes ======
    const EGameNotActive: u64 = 1;
    const EGameAlreadyEnded: u64 = 2;
    const EInsufficientStake: u64 = 3;
    const EAlreadyJoined: u64 = 4;
    const EInvalidCoordinates: u64 = 5;
    const ENotGameMember: u64 = 6;
    const EGameNotEnded: u64 = 7;
    const EAlreadyClaimed: u64 = 8;
    const EInsufficientFunds: u64 = 9;
    const EPowerUpNotActive: u64 = 10;

    // ====== Enums ======
    const TEAM_RED: u8 = 1;
    const TEAM_BLUE: u8 = 2;

    const POWERUP_SPEED: u8 = 1;
    const POWERUP_BOMB: u8 = 2;
    const POWERUP_SHIELD: u8 = 3;

    // ====== Structs ======

    /// Main game state
    public struct Game has key, store {
        id: UID,
        game_number: u64,
        canvas_width: u32,
        canvas_height: u32,
        start_time: u64,
        end_time: u64,
        is_active: bool,
        prize_pool: Balance<SUI>,
        red_team_pixels: u32,
        blue_team_pixels: u32,
        total_players: u64,
    }

    /// Player info stored as dynamic field
    public struct PlayerInfo has store, drop {
        team: u8,
        stake_amount: u64,
        pixels_painted: u32,
        has_claimed: bool,
        speed_boost_until: u64,
        shield_active_until: u64,
    }

    /// Pixel data stored as dynamic field with (x, y) key
    public struct PixelKey has store, copy, drop {
        x: u32,
        y: u32,
    }

    public struct PixelData has store, drop {
        team: u8,
        painter: address,
        timestamp: u64,
        is_shielded: bool,
    }

    /// Admin capability
    public struct AdminCap has key {
        id: UID,
    }

    /// Player ticket for game participation
    public struct PlayerTicket has key, store {
        id: UID,
        game_id: ID,
        player: address,
        team: u8,
    }

    // ====== Events ======

    public struct GameCreated has copy, drop {
        game_id: ID,
        game_number: u64,
        start_time: u64,
        end_time: u64,
    }

    public struct PlayerJoined has copy, drop {
        game_id: ID,
        player: address,
        team: u8,
        stake_amount: u64,
    }

    public struct PixelPainted has copy, drop {
        game_id: ID,
        x: u32,
        y: u32,
        team: u8,
        painter: address,
        timestamp: u64,
    }

    public struct PowerUpUsed has copy, drop {
        game_id: ID,
        player: address,
        powerup_type: u8,
        cost: u64,
    }

    public struct GameEnded has copy, drop {
        game_id: ID,
        winner_team: u8,
        red_pixels: u32,
        blue_pixels: u32,
        prize_pool: u64,
    }

    public struct RewardClaimed has copy, drop {
        game_id: ID,
        player: address,
        amount: u64,
    }

    // ====== Init Function ======

    fun init(ctx: &mut TxContext) {
        let admin_cap = AdminCap {
            id: object::new(ctx),
        };
        transfer::transfer(admin_cap, ctx.sender());
    }

    // ====== Admin Functions ======

    /// Create a new game
    public entry fun create_game(
        _: &AdminCap,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let start_time = clock::timestamp_ms(clock);
        let end_time = start_time + GAME_DURATION_MS;
        
        let game_number = ctx.epoch();
        
        let game = Game {
            id: object::new(ctx),
            game_number,
            canvas_width: CANVAS_WIDTH,
            canvas_height: CANVAS_HEIGHT,
            start_time,
            end_time,
            is_active: true,
            prize_pool: balance::zero(),
            red_team_pixels: 0,
            blue_team_pixels: 0,
            total_players: 0,
        };

        let game_id = object::id(&game);

        event::emit(GameCreated {
            game_id,
            game_number,
            start_time,
            end_time,
        });

        transfer::share_object(game);
    }

    /// End game manually (admin function)
    public entry fun end_game(
        _: &AdminCap,
        game: &mut Game,
        clock: &Clock,
        _ctx: &mut TxContext
    ) {
        assert!(game.is_active, EGameAlreadyEnded);
        
        game.is_active = false;
        let current_time = clock::timestamp_ms(clock);
        game.end_time = current_time;

        emit_game_ended(game);
    }

    // ====== Player Functions ======

    /// Join a team by staking SUI
    public entry fun join_team(
        game: &mut Game,
        team: u8,
        payment: Coin<SUI>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let current_time = clock::timestamp_ms(clock);
        assert!(game.is_active && current_time < game.end_time, EGameNotActive);
        
        let stake_amount = coin::value(&payment);
        assert!(stake_amount >= MIN_STAKE, EInsufficientStake);
        assert!(team == TEAM_RED || team == TEAM_BLUE, EInvalidCoordinates);

        let player = ctx.sender();
        
        // Check if player already joined
        assert!(!df::exists_(&game.id, player), EAlreadyJoined);

        // Add stake to prize pool
        let payment_balance = coin::into_balance(payment);
        balance::join(&mut game.prize_pool, payment_balance);

        // Store player info
        let player_info = PlayerInfo {
            team,
            stake_amount,
            pixels_painted: 0,
            has_claimed: false,
            speed_boost_until: 0,
            shield_active_until: 0,
        };
        df::add(&mut game.id, player, player_info);

        game.total_players = game.total_players + 1;

        // Create player ticket
        let ticket = PlayerTicket {
            id: object::new(ctx),
            game_id: object::id(game),
            player,
            team,
        };

        event::emit(PlayerJoined {
            game_id: object::id(game),
            player,
            team,
            stake_amount,
        });

        transfer::transfer(ticket, player);
    }

    /// Paint a pixel
    public entry fun paint_pixel(
        game: &mut Game,
        x: u32,
        y: u32,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let current_time = clock::timestamp_ms(clock);
        assert!(game.is_active && current_time < game.end_time, EGameNotActive);
        assert!(x < game.canvas_width && y < game.canvas_height, EInvalidCoordinates);

        let player = ctx.sender();
        assert!(df::exists_(&game.id, player), ENotGameMember);

        // Get player team (separate borrow scope)
        let team = {
            let player_info = df::borrow<address, PlayerInfo>(&game.id, player);
            player_info.team
        };

        // Check if pixel exists
        let pixel_key = PixelKey { x, y };
        
        if (df::exists_with_type<PixelKey, PixelData>(&game.id, pixel_key)) {
            // Pixel exists, check if can override
            let existing_pixel = df::borrow_mut<PixelKey, PixelData>(&mut game.id, pixel_key);
            
            // Cannot override shielded pixels
            if (existing_pixel.is_shielded) {
                assert!(existing_pixel.timestamp + 60000 < current_time, EPowerUpNotActive); // Shield lasts 1 min
                existing_pixel.is_shielded = false;
            };

            // Update pixel count if team changed
            if (existing_pixel.team != team) {
                if (existing_pixel.team == TEAM_RED) {
                    game.red_team_pixels = game.red_team_pixels - 1;
                    game.blue_team_pixels = game.blue_team_pixels + 1;
                } else {
                    game.blue_team_pixels = game.blue_team_pixels - 1;
                    game.red_team_pixels = game.red_team_pixels + 1;
                };
            };

            // Update pixel data
            existing_pixel.team = team;
            existing_pixel.painter = player;
            existing_pixel.timestamp = current_time;
        } else {
            // New pixel
            let pixel_data = PixelData {
                team,
                painter: player,
                timestamp: current_time,
                is_shielded: false,
            };
            df::add(&mut game.id, pixel_key, pixel_data);

            // Update pixel count
            if (team == TEAM_RED) {
                game.red_team_pixels = game.red_team_pixels + 1;
            } else {
                game.blue_team_pixels = game.blue_team_pixels + 1;
            };
        };

        // Update player stats (separate borrow scope)
        let player_info = df::borrow_mut<address, PlayerInfo>(&mut game.id, player);
        player_info.pixels_painted = player_info.pixels_painted + 1;

        event::emit(PixelPainted {
            game_id: object::id(game),
            x,
            y,
            team,
            painter: player,
            timestamp: current_time,
        });
    }

    /// Buy speed boost power-up
    public entry fun buy_speed_boost(
        game: &mut Game,
        payment: Coin<SUI>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let current_time = clock::timestamp_ms(clock);
        assert!(game.is_active && current_time < game.end_time, EGameNotActive);
        
        let cost = coin::value(&payment);
        assert!(cost >= POWERUP_SPEED_COST, EInsufficientFunds);

        let player = ctx.sender();
        assert!(df::exists_(&game.id, player), ENotGameMember);

        // Add to prize pool
        let payment_balance = coin::into_balance(payment);
        balance::join(&mut game.prize_pool, payment_balance);

        // Activate speed boost for 30 seconds
        let player_info = df::borrow_mut<address, PlayerInfo>(&mut game.id, player);
        player_info.speed_boost_until = current_time + 30000;

        event::emit(PowerUpUsed {
            game_id: object::id(game),
            player,
            powerup_type: POWERUP_SPEED,
            cost,
        });
    }

    /// Buy bomb power-up (erase enemy pixels in area)
    public entry fun buy_bomb(
        game: &mut Game,
        payment: Coin<SUI>,
        target_x: u32,
        target_y: u32,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let current_time = clock::timestamp_ms(clock);
        assert!(game.is_active && current_time < game.end_time, EGameNotActive);
        assert!(target_x < game.canvas_width && target_y < game.canvas_height, EInvalidCoordinates);
        
        let cost = coin::value(&payment);
        assert!(cost >= POWERUP_BOMB_COST, EInsufficientFunds);

        let player = ctx.sender();
        assert!(df::exists_(&game.id, player), ENotGameMember);

        let player_info = df::borrow<address, PlayerInfo>(&game.id, player);
        let player_team = player_info.team;

        // Add to prize pool
        let payment_balance = coin::into_balance(payment);
        balance::join(&mut game.prize_pool, payment_balance);

        // Erase pixels in 3x3 area around target
        let mut i = 0;
        while (i < 3) {
            let mut j = 0;
            while (j < 3) {
                let x = if (target_x >= i) { target_x - i } else { 0 };
                let y = if (target_y >= j) { target_y - j } else { 0 };
                
                if (x < game.canvas_width && y < game.canvas_height) {
                    let pixel_key = PixelKey { x, y };
                    if (df::exists_with_type<PixelKey, PixelData>(&game.id, pixel_key)) {
                        // Check pixel properties first (separate borrow scope)
                        let should_remove = {
                            let pixel = df::borrow<PixelKey, PixelData>(&game.id, pixel_key);
                            pixel.team != player_team && !pixel.is_shielded
                        };
                        
                        // Remove if needed
                        if (should_remove) {
                            let removed_pixel = df::remove<PixelKey, PixelData>(&mut game.id, pixel_key);
                            if (removed_pixel.team == TEAM_RED) {
                                game.red_team_pixels = game.red_team_pixels - 1;
                            } else {
                                game.blue_team_pixels = game.blue_team_pixels - 1;
                            };
                        };
                    };
                };
                j = j + 1;
            };
            i = i + 1;
        };

        event::emit(PowerUpUsed {
            game_id: object::id(game),
            player,
            powerup_type: POWERUP_BOMB,
            cost,
        });
    }

    /// Buy shield power-up (protect a pixel)
    public entry fun buy_shield(
        game: &mut Game,
        payment: Coin<SUI>,
        shield_x: u32,
        shield_y: u32,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let current_time = clock::timestamp_ms(clock);
        assert!(game.is_active && current_time < game.end_time, EGameNotActive);
        assert!(shield_x < game.canvas_width && shield_y < game.canvas_height, EInvalidCoordinates);
        
        let cost = coin::value(&payment);
        assert!(cost >= POWERUP_SHIELD_COST, EInsufficientFunds);

        let player = ctx.sender();
        assert!(df::exists_(&game.id, player), ENotGameMember);

        // Add to prize pool
        let payment_balance = coin::into_balance(payment);
        balance::join(&mut game.prize_pool, payment_balance);

        // Shield the pixel
        let pixel_key = PixelKey { x: shield_x, y: shield_y };
        if (df::exists_with_type<PixelKey, PixelData>(&game.id, pixel_key)) {
            let pixel = df::borrow_mut<PixelKey, PixelData>(&mut game.id, pixel_key);
            pixel.is_shielded = true;
            pixel.timestamp = current_time;
        };

        event::emit(PowerUpUsed {
            game_id: object::id(game),
            player,
            powerup_type: POWERUP_SHIELD,
            cost,
        });
    }

    /// Claim reward after game ends
    public entry fun claim_reward(
        game: &mut Game,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let current_time = clock::timestamp_ms(clock);
        assert!(!game.is_active || current_time >= game.end_time, EGameNotEnded);

        // End game if time expired
        if (game.is_active && current_time >= game.end_time) {
            game.is_active = false;
            emit_game_ended(game);
        };

        let player = ctx.sender();
        assert!(df::exists_(&game.id, player), ENotGameMember);

        let player_info = df::borrow_mut<address, PlayerInfo>(&mut game.id, player);
        assert!(!player_info.has_claimed, EAlreadyClaimed);

        // Determine winner team
        let winner_team = if (game.red_team_pixels > game.blue_team_pixels) {
            TEAM_RED
        } else if (game.blue_team_pixels > game.red_team_pixels) {
            TEAM_BLUE
        } else {
            0 // Tie - both teams win
        };

        // Check if player is in winning team
        let is_winner = winner_team == 0 || player_info.team == winner_team;
        
        player_info.has_claimed = true;

        // Calculate and distribute reward
        let mut reward_amount = 0u64;
        if (is_winner) {
            let total_pool = balance::value(&game.prize_pool);
            
            if (total_pool > 0 && game.total_players > 0) {
                // Strategy: Distribute proportionally based on contribution within winning team
                // Get winning team's total pixels
                let winning_team_pixels = if (winner_team == TEAM_RED) {
                    game.red_team_pixels
                } else if (winner_team == TEAM_BLUE) {
                    game.blue_team_pixels
                } else {
                    // Tie case: use total pixels
                    game.red_team_pixels + game.blue_team_pixels
                };

                if (winning_team_pixels > 0 && player_info.pixels_painted > 0) {
                    // Calculate player's contribution percentage (multiply by 10000 for precision)
                    let player_contribution = ((player_info.pixels_painted as u64) * 10000) / (winning_team_pixels as u64);
                    
                    // Calculate reward amount based on contribution
                    reward_amount = (total_pool * player_contribution) / 10000;
                    
                    // Ensure we don't exceed available pool (rounding protection)
                    let available_pool = balance::value(&game.prize_pool);
                    if (reward_amount > available_pool) {
                        reward_amount = available_pool;
                    };
                };
            };
        };

        if (reward_amount > 0) {
            let reward_balance = balance::split(&mut game.prize_pool, reward_amount);
            let reward_coin = coin::from_balance(reward_balance, ctx);
            transfer::public_transfer(reward_coin, player);

            event::emit(RewardClaimed {
                game_id: object::id(game),
                player,
                amount: reward_amount,
            });
        };
    }

    // ====== Helper Functions ======

    fun emit_game_ended(game: &Game) {
        let winner_team = if (game.red_team_pixels > game.blue_team_pixels) {
            TEAM_RED
        } else if (game.blue_team_pixels > game.red_team_pixels) {
            TEAM_BLUE
        } else {
            0 // Tie
        };

        event::emit(GameEnded {
            game_id: object::id(game),
            winner_team,
            red_pixels: game.red_team_pixels,
            blue_pixels: game.blue_team_pixels,
            prize_pool: balance::value(&game.prize_pool),
        });
    }

    // ====== View Functions ======

    public fun get_game_info(game: &Game): (u64, u32, u32, u64, u64, bool, u64, u32, u32) {
        (
            game.game_number,
            game.canvas_width,
            game.canvas_height,
            game.start_time,
            game.end_time,
            game.is_active,
            balance::value(&game.prize_pool),
            game.red_team_pixels,
            game.blue_team_pixels,
        )
    }

    public fun get_pixel_data(game: &Game, x: u32, y: u32): (bool, u8, address) {
        let pixel_key = PixelKey { x, y };
        if (df::exists_with_type<PixelKey, PixelData>(&game.id, pixel_key)) {
            let pixel = df::borrow<PixelKey, PixelData>(&game.id, pixel_key);
            (true, pixel.team, pixel.painter)
        } else {
            (false, 0, @0x0)
        }
    }

    // ====== Test Functions ======
    
    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) {
        init(ctx);
    }
}
