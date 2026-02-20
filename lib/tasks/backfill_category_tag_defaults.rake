namespace :tags do
  desc "Backfill category default tags from existing tagged payments"
  task backfill_category_defaults: :environment do
    STDOUT.sync = true
    user_id = ENV["USER_ID"]

    scope = if user_id.present?
              User.where(id: user_id)
            else
              User.all
            end

    total_created = 0

    scope.find_each do |user|
      # Find all (spending_category_id, tag_id) pairs from tagged payments
      payment_category_tags = TagAssignment
        .joins("INNER JOIN payments ON payments.id = tag_assignments.taggable_id AND tag_assignments.taggable_type = 'Payment'")
        .where(user_id: user.id)
        .where("payments.spending_category_id IS NOT NULL")
        .distinct
        .pluck(Arel.sql("payments.spending_category_id"), :tag_id)

      next if payment_category_tags.empty?

      # Find existing category default tag assignments
      existing = TagAssignment
        .where(user_id: user.id, taggable_type: "SpendingCategory")
        .pluck(:taggable_id, :tag_id)
        .to_set

      created = 0
      payment_category_tags.each do |category_id, tag_id|
        next if existing.include?([category_id, tag_id])

        TagAssignment.create!(
          user_id: user.id,
          tag_id: tag_id,
          taggable_type: "SpendingCategory",
          taggable_id: category_id
        )
        created += 1
      end

      puts "User #{user.id} (#{user.email}): #{created} new category default tags" if created > 0
      total_created += created
    end

    puts "Done. Total new category default tags created: #{total_created}"
  end
end
