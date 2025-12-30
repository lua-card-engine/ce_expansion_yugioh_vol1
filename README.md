# 🃏 CardEngine Expansion Set: Yu-Gi-Oh Vol 1

This repository contains the Yu-Gi-Oh Vol 1 Base Expansion Set for the yet to be released CardEngine, a comprehensive collectible card framework for Garry's Mod. This expansion set introduces a variety of cards for players to collect and trade.

## 🚀 Usage

To use this expansion set in your Garry's Mod server, follow these steps:

1. Ensure CardEngine is installed on your Garry's Mod server.

2. Download or clone this repository to your local machine into a `ce_expansion_yugioh_vol1` folder.

3. Copy that entire `ce_expansion_yugioh_vol1` folder into the `addons/` directory of your Garry's Mod installation.

4. After the above steps, the folder structure should look like this:

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
<!-- DISTRIBUTION START -->
## 📦 Distribution

The files in this expansion set are distributed through Cloudflare R2. See [the `sync-to-r2` GitHub Action configuration](.github/workflows/sync-to-r2.yml) to understand how the distribution works.

**In short:** Whenever the contents of the `materials/` folder are changed and pushed to the `main` branch, those changes are automatically uploaded to Cloudflare R2 for distribution. In [the `sh_init.lua` configuration file of this expansion set](lua/ce_expansion_yugioh_vol1/sh_init.lua), the R2 URL is setup as the remote location where CardEngine should look for the card materials:

```lua
CardEngine.ExpansionSet.Register({
    RemoteDownloadURL = "https://<the URL to CloudFlare R2>/",
    --- ... (other configuration options)
})
```

If a new player connects and does not have the card materials yet, CardEngine will download them from that R2 URL.

### Required Setup in GitHub

To enable the automatic synchronization to Cloudflare R2, you need to set up the following GitHub Secrets in your repository settings:

- `R2_ACCOUNT_ID`: You can find this in your Cloudflare R2 dashboard under "R2 object storage" > "Overview" > "Account Details".
- `R2_ACCESS_KEY_ID`: This can be created in your Cloudflare R2 dashboard under "Manage Account" > "Account API Tokens". It can only be seen once when created, so it's probably best to store this as an organization secret if you have multiple repositories using the same R2 bucket. Make sure the token gets both "Read" and "Write" permissions for R2.
- `R2_SECRET_ACCESS_KEY`: See the instructions for `R2_ACCESS_KEY_ID`.
- `R2_BUCKET_NAME`: The name of the R2 bucket where the card materials will be stored.

Additionally, add this variable to the repository, to specify the expansion subfolder in the R2 bucket:

- `EXPANSION_FOLDER`: Set this to `ce_expansion_yugioh_vol1` for this expansion set.
<!-- DISTRIBUTION END -->

## 🛠️ Tools

This expansion set comes with a handy tool to convert `.png` card designs into the required `.vtf` format for use in Garry's Mod.

### PNG to VTF Converter

To convert your `.png` card designs to `.vtf`, follow these steps:

1. Open a terminal or command prompt.

2. Navigate to the [`tools/`](tools/) directory of this repository:

    ```bash
    cd tools/
    ```

3. Install the required node modules:

    ```bash
    npm install
    ```

4. To convert all `.png` files in the `design/` folder to `.vtf` format in the `materials/card_engine/expansions/ce_expansion_yugioh_vol1` folder, run the following command:

    ```bash
    npm run convert
    ```
