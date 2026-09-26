# 🃏 CardEngine Expansion Set: Yu-Gi-Oh Vol 1

This repository contains the Yu-Gi-Oh Vol 1 Base Expansion Set for the yet to be released CardEngine, a comprehensive collectible card framework for Garry's Mod. This expansion set introduces a variety of cards for players to collect and trade.

> [!WARNING]
> This expansion only serves as an example of how to download and prepare cards for CardEngine. It is incomplete, such as missing holographic effects for all cards.
> We do not provide support for this expansion and it should not serve as a reason to purchase CardEngine.

## 🚀 Usage

1. Ensure CardEngine is already installed on your Garry's Mod server.

2. [Download](https://github.com/lua-card-engine/ce_expansion_yugioh_vol1/archive/refs/heads/main.zip) this repository to your local machine.

3. Extract the downloaded zip file into the `garrysmod/addons/` directory of your Garry's Mod installation.

4. (Optional) After downloading from git the folder will be named `ce_expansion_yugioh_vol1-main`. Rename it to `ce_expansion_yugioh_vol1`, which is a cleaner name.

5. After the above steps, the folder structure should look like this:

    ```plaintext
    garrysmod/
    └── addons/
        └── ce_expansion_yugioh_vol1/
            ├── design/
            │   └── ...
            ├── lua/
            │   ├── autorun/
            │   │   └── ce_expansion_yugioh_vol1.lua
            │   └── ce_expansion_yugioh_vol1/
            │       └── ...
            ├── materials/
            │   └── card_engine/
            │       └── expansions/
            │           └── ce_expansion_yugioh_vol1/
            ├── tools/
            │   └── ...
            └── ...
    ```

**That's it!** You can now (re)start your Garry's Mod server and enjoy the Yu-Gi-Oh! Vol 1 Expansion Set in CardEngine.

[&raquo; See Advanced Usage if you want to self-host the card materials](ADVANCED_USAGE.md)

## 📄 License

The code in this repository is licensed under the [MIT License](LICENSE).

The card designs, artwork and card data are the property of their respective owners and are used here for educational and non-commercial purposes only. Please respect the intellectual property rights of the original creators.
