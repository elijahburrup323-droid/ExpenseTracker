class CleanLegalPageSectionBodies < ActiveRecord::Migration[7.1]
  def up
    LegalPageSection.find_each do |s|
      body = s.section_body.to_s
      # Strip outer div wrappers with Tailwind classes
      cleaned = body.gsub(/<div[^>]*class=["'][^"']*["'][^>]*>\s*/i, "").gsub(/<\/div>\s*/i, "")
      # Remove class attributes from h2/h3/p/span tags
      cleaned = cleaned.gsub(/(<(?:h2|h3|p|span)[^>]*)\s+class="[^"]*"/, '\1')
      # Remove id and data- attributes from h2 tags
      cleaned = cleaned.gsub(/(<h2[^>]*)\s+id="[^"]*"/, '\1')
      cleaned = cleaned.gsub(/(<h2[^>]*)\s+data-section="[^"]*"/, '\1')
      cleaned = cleaned.strip
      s.update_column(:section_body, cleaned) if cleaned != body
    end
  end

  def down
    # Not reversible — original HTML had Tailwind styling wrappers
  end
end
