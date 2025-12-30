CardEngine = CardEngine or {}
CardEngine.ExpansionSets = CardEngine.ExpansionSets or {}
CardEngine.ExpansionSets.YugiohVol1 = CardEngine.ExpansionSets.YugiohVol1 or {}

hook.Add(
	"CardEngineInitializeExpansionPacks",
	"CardEngine.YugiohVol1.InitializeExpansionPack",
	function()
		if (not CardEngine) then
			ErrorNoHalt("Card Engine not found! Expansion pack 'ce_expansion_yugioh_vol1' will not load.\n")
			return
		end

		local EXPANSION_SET_ID = "ce_expansion_yugioh_vol1"

		-- Register the expansion set with its metadata and filterable attributes
		CardEngine.ExpansionSet.Register({
			UniqueID = EXPANSION_SET_ID,
			Name = "expansion_set_ce_expansion_yugioh_vol1",
			Image = "card_engine/expansions/ce_expansion_yugioh_vol1/set_logo.png",
			RemoteDownloadURL = "https://card-engine-r2.luttonline.nl",

			-- Define which attributes should appear as filters in the collection menu
			FilterableAttributes = {
				HumanReadableCardType = {
					Name = "collection_filter_card_type",
					AttributeName = "Card Type",
					IsArray = false,
				},
				Typeline = {
					Name = "collection_filter_typeline",
					AttributeName = "Typeline",
					IsArray = true,
				},
			},
		})

		CardEngine.Collection.IncludeDirectory(
			CardEngine.PathCombine("ce_expansion_yugioh_vol1", "cards/"),
			nil,
			-- Automatically inject the ExpansionSet property into all cards loaded from this expansion pack
			function(fileName, cardFilePath)
				CARD.ExpansionSet = EXPANSION_SET_ID
			end
		)

		CardEngine.Booster.IncludeDirectory(
			CardEngine.PathCombine("ce_expansion_yugioh_vol1", "boosters/"),
			nil,
			function(fileName, boosterFilePath)
				BOOSTER.ExpansionSet = EXPANSION_SET_ID
			end
		)

		CardEngine.Language.IncludeDirectory(CardEngine.PathCombine("ce_expansion_yugioh_vol1", "languages/"))
	end
)
