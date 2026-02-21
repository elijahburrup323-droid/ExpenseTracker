# Seed legal_page_sections from existing legal_pages HTML content
# Splits on the section wrapper div pattern and extracts h2 title + body

LegalPage.published.each do |page|
  next if page.legal_page_sections.any? # Already seeded

  html = page.content.to_s
  # Split on the section wrapper divs
  sections = html.split(/(?=<div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm ring-1)/).reject(&:blank?)

  sections.each_with_index do |section_html, idx|
    # Extract title from h2 data-section attribute
    title_match = section_html.match(/data-section="([^"]+)"/)
    h2_match = section_html.match(/<h2[^>]*>(\d+)\.\s*([^<]+)<\/h2>/)
    section_num = h2_match ? h2_match[1].to_i : idx + 1
    title = title_match ? title_match[1] : (h2_match ? h2_match[2].strip : "Section #{idx + 1}")

    page.legal_page_sections.create!(
      section_number: section_num,
      section_title: title,
      section_body: section_html.strip,
      display_order: idx + 1,
      is_active: true
    )
  end

  puts "  Seeded #{page.legal_page_sections.count} sections for #{page.slug}"
end
