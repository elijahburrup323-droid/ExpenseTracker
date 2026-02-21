class SeedLegalPageSections < ActiveRecord::Migration[7.1]
  def up
    LegalPage.where.not(published_at: nil).each do |page|
      next if page.legal_page_sections.any?

      html = page.content.to_s
      sections = html.split(/(?=<div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm ring-1)/).reject(&:blank?)

      sections.each_with_index do |section_html, idx|
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
    end
  end

  def down
    LegalPageSection.delete_all
  end
end
