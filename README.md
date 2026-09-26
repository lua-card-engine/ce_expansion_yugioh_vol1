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

### Pushing to R2 locally

You can also push the materials to R2 from your own machine, which mirrors what the GitHub Action does (upload new and changed files, delete files that no longer exist locally):

1. Copy [`.env.example`](.env.example) to `.env` in the repository root and fill in the same `R2_*` values as the GitHub secrets above. The `.env` file is gitignored.
2. From the [`tools/`](tools/) directory (after `npm install`) run:

    ```bash
    npm run sync-r2              # upload
    npm run sync-r2 -- --dry-run # only show what would change
    ```

> [!WARNING]
> Like the GitHub Action, this is a full sync: files in the bucket that are not in your local `materials/` folder are deleted. Use `--dry-run` first if unsure.

## 🛠️ Tools

This expansion set comes with a handy tool to convert `.png` card designs into the required `.vtf` format for use in Garry's Mod. And to download and properly resize card images from the [Yu-Gi-Oh! Pro Deck API](https://ygoprodeck.com/api-guide/).

For all these tools you must:

1. Open a terminal or command prompt in the repository root folder.

2. Navigate to the [`tools/`](tools/) directory of this repository:

    ```bash
    cd tools/
    ```

3. Install the required node modules:

    ```bash
    npm install
    ```

### `db.ygoprodeck.com/api/v7/` Downloader

To download a card images from the [Yu-Gi-Oh! Pro Deck API](https://ygoprodeck.com/api-guide/), you can use the provided `download.js` script located in the [`tools/`](tools/) directory.

1. Run the downloader script with Node.js, specifying the date range, date region (ocg/tcg), and the set code to use when naming the files. For example, to download all cards from February 4, 1999, in the OCG region and name it the "vol1" set, use the following command:

    ```bash
    node download.js 1999-02-04 1999-02-04 ocg vol1
    ```

2. The script will download the card images and save them as `.png` files in the `design/unprocessed` folder.

### Process Images

To process and resize the downloaded card images to fit the required dimensions for CardEngine, follow these steps:

1. Run the image processing script with Node.js:

    ```bash
    npm run process
    ```

2. The script will resize the images and save them in the `design/processed/` folder, ready for conversion to `.vtf`.

### PNG to VTF Converter

To convert your `.png` card designs to `.vtf`, follow these steps:

1. To convert all `.png` files in the `design/processed/` folder to `.vtf` format in the `materials/card_engine/expansions/ce_expansion_yugioh_vol1` folder, run the following command:

    ```bash
    npm run convert
    ```

## 📄 License

The code in this repository is licensed under the [MIT License](LICENSE).

The card designs, artwork and card data are the property of their respective owners and are used here for educational and non-commercial purposes only. Please respect the intellectual property rights of the original creators.
