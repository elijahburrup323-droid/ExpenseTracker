module ApplicationHelper
  def flash_class_for(type)
    case type.to_sym
    when :notice, :success
      "bg-green-50 border-green-400 text-green-800"
    when :alert, :error
      "bg-red-50 border-red-400 text-red-800"
    when :warning
      "bg-yellow-50 border-yellow-400 text-yellow-800"
    else
      "bg-blue-50 border-blue-400 text-blue-800"
    end
  end

  def page_title
    titles = {
      "dashboard#index"              => "Dashboard",
      "accounts#index"               => "Accounts",
      "account_types#index"          => "Account Types",
      "spending_types#index"         => "Spending Types",
      "spending_categories#index"    => "Categories",
      "payments#index"               => "Payments",
      "income_entries#index"         => "Income Entries",
      "income_recurrings#index"      => "Deposit Sources",
      "income_frequency_masters#index"=> "Frequency Masters",
      "income_user_frequencies#index"=> "Frequencies",
      "documentation#index"          => "Documentation",
      "documentation#database_schema"=> "Database Schema",
      "documentation#claude_prompt"  => "Claude.ai Prompt",
      "users#index"                  => "Users",
    }
    titles["#{controller_name}##{action_name}"] || controller_name.titleize
  end
end
