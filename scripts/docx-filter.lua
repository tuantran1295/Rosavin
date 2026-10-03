-- pandoc Lua filter used by scripts/docs-to-docx.mjs when converting the user
-- guides to Word: sizes images, shows the logo without a caption and starts
-- the guide body on a new page after the table of contents.

local WIDTHS = {
  { 'logo', '42%' },
  { 'menubar-icons', '78%' },
  { 'dmg-installer', '82%' },
  { '03-menu', '88%' },
}

local function width_for(src)
  for _, rule in ipairs(WIDTHS) do
    if src:find(rule[1], 1, true) then return rule[2] end
  end
  return '100%'
end

function Image(img)
  if not img.attributes.width then img.attributes.width = width_for(img.src) end
  return img
end

-- The logo is decoration: a centred image without a figure caption.
function Figure(fig)
  local logo
  pandoc.walk_block(fig, { Image = function(img) if img.src:find('logo', 1, true) then logo = img end end })
  if logo then
    logo.attributes.width = width_for(logo.src)
    return pandoc.Div({ pandoc.Para({ logo }) }, pandoc.Attr('', {}, { ['custom-style'] = 'Figure' }))
  end
end

local PAGE_BREAK = pandoc.RawBlock('openxml', '<w:p><w:r><w:br w:type="page"/></w:r></w:p>')

function Pandoc(doc)
  local blocks, after_contents, inserted = {}, false, false
  for _, block in ipairs(doc.blocks) do
    if block.t == 'Header' and block.level == 2 then
      if after_contents and not inserted then
        table.insert(blocks, PAGE_BREAK)
        inserted = true
      end
      local id = block.identifier
      if id == 'contents' or id == 'mục-lục' then after_contents = true end
    end
    table.insert(blocks, block)
  end
  doc.blocks = blocks
  return doc
end
