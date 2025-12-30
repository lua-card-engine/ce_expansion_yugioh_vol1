CardEngine = CardEngine or {}
CardEngine.ExpansionSets = CardEngine.ExpansionSets or {}
CardEngine.ExpansionSets.{{ EXPANSION_ID_PASCAL_CASE }} = CardEngine.ExpansionSets.{{ EXPANSION_ID_PASCAL_CASE }} or {}

hook.Add(
	"CardEngineInitializeExpansionPacks",
	"CardEngine.{{ EXPANSION_ID_PASCAL_CASE }}.InitializeExpansionPack",
	function()
		if (not CardEngine) then
			ErrorNoHalt("Card Engine not found! Expansion pack '{{ EXPANSION_ID }}' will not load.\n")
			return
		end

		local EXPANSION_SET_ID = "{{ EXPANSION_ID }}"

		-- Register the expansion set with its metadata and filterable attributes
		CardEngine.ExpansionSet.Register({
			UniqueID = EXPANSION_SET_ID,
			Name = "expansion_set_{{ EXPANSION_ID }}",
			Image = "card_engine/expansions/{{ EXPANSION_ID }}/set_logo.png",
{{ EXPANSION_REMOTE_DOWNLOAD_URL_LINE }}
			-- Define which attributes should appear as filters in the collection menu
			FilterableAttributes = {
				Supertype = {
					Name = "collection_filter_supertype",
					AttributeName = "Supertype",
					IsArray = false,
				},
				Rarity = {
					Name = "collection_filter_rarity",
					AttributeName = "Rarity",
					IsArray = false,
				},
			},
		})

		CardEngine.Collection.IncludeDirectory(
			CardEngine.PathCombine("{{ EXPANSION_ID }}", "cards/"),
			nil,
			-- Automatically inject the ExpansionSet property into all cards loaded from this expansion pack
			function(fileName, cardFilePath)
				CARD.ExpansionSet = EXPANSION_SET_ID
			end
		)

		CardEngine.Booster.IncludeDirectory(
			CardEngine.PathCombine("{{ EXPANSION_ID }}", "boosters/"),
			nil,
			function(fileName, boosterFilePath)
				BOOSTER.ExpansionSet = EXPANSION_SET_ID
			end
		)

		CardEngine.Language.IncludeDirectory(CardEngine.PathCombine("{{ EXPANSION_ID }}", "languages/"))
	end
)
