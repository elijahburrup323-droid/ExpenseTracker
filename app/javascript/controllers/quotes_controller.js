import { Controller } from "@hotwired/stimulus"

const QUOTES = [
  "A budget is telling your money where to go instead of wondering where it went.",
  "Do not save what is left after spending, but spend what is left after saving.",
  "The habit of saving is itself an education; it fosters every virtue.",
  "Beware of little expenses. A small leak will sink a great ship.",
  "It's not your salary that makes you rich, it's your spending habits.",
  "Every dollar you save is a dollar you earn.",
  "Financial peace isn't the acquisition of stuff. It's learning to live on less than you make.",
  "A penny saved is a penny earned.",
  "The art is not in making money, but in keeping it.",
  "Too many people spend money they haven't earned to buy things they don't want to impress people they don't like.",
  "Never spend your money before you have it.",
  "Money looks better in the bank than on your feet.",
  "The secret to wealth is simple: spend less than you earn and invest the difference.",
  "You must gain control over your money or the lack of it will forever control you.",
  "Wealth consists not in having great possessions, but in having few wants.",
  "A wise person should have money in their head, but not in their heart.",
  "Don't tell me what you value. Show me your budget, and I'll tell you what you value.",
  "An investment in knowledge pays the best interest.",
  "The goal isn't more money. The goal is living life on your terms.",
  "Rich people stay rich by living like they're broke. Broke people stay broke by living like they're rich.",
  "It is not the man who has too little, but the man who craves more, that is poor.",
  "Money is a terrible master but an excellent servant.",
  "The quickest way to double your money is to fold it in half and put it back in your pocket.",
  "Budget: a mathematical confirmation of your suspicions.",
  "The best time to start saving was yesterday. The next best time is today.",
  "Wealth is the ability to fully experience life.",
  "He who buys what he does not need steals from himself.",
  "A budget doesn't limit your freedom. It gives you freedom.",
  "Saving is a very fine thing. Especially when your parents have done it for you.",
  "Frugality includes all the other virtues.",
  "Money saved is money earned twice.",
  "Live below your means but within your needs.",
  "Small daily improvements over time lead to stunning financial results.",
  "The more you save, the more freedom you have.",
  "Spend wisely, save consistently, and your future self will thank you.",
  "Financial fitness is not a pipe dream or a state of mind. It's a reality if you are willing to pursue it.",
  "There is no dignity quite so impressive as living within your means.",
  "Money grows on the tree of persistence.",
  "The only way to permanently change the temperature in the room is to reset the thermostat. In the same way, the only way to change your level of financial success permanently is to reset your financial thermostat.",
  "If you want to be wealthy, study wealth. If you want to be happy, study happiness.",
  "A simple fact that is hard to learn is that the time to save money is when you have some.",
  "When you understand that your self-worth is not determined by your net-worth, then you'll have financial freedom.",
  "Don't go broke trying to look rich.",
  "You don't have to be a miser, just be wiser with your money.",
  "Budgeting has only one rule: do not go over budget.",
  "Money is only a tool. It will take you wherever you wish, but it will not replace you as the driver.",
  "The way to build your savings is by spending less each month.",
  "Know what you own, and know why you own it.",
  "Setting goals is the first step in turning the invisible into the visible.",
  "Discipline is the bridge between goals and accomplishment.",
  "What we really want to do is what we are really meant to do. When we do what we are meant to do, money comes to us, doors open for us, we feel useful, and the work we do feels like play to us.",
  "Every morning brings new potential, but if you dwell on the misfortunes of the day before, you tend to overlook tremendous opportunities.",
  "Formal education will make you a living; self-education will make you a fortune.",
  "A budget is more than just a series of numbers on a page; it is an embodiment of our values.",
  "Financial independence is about having more choices.",
  "The lack of money is the root of all evil.",
  "Money without financial intelligence is money soon gone.",
  "Courage is the most important of all the virtues because without courage, you can't practice any other virtue consistently.",
  "Opportunity is missed by most people because it is dressed in overalls and looks like work.",
  "A big part of financial freedom is having your heart and mind free from worry about the what-ifs of life.",
  "If you don't find a way to make money while you sleep, you will work until you die.",
  "The individual investor should act consistently as an investor and not as a speculator.",
  "Invest in as much of yourself as you can. You are your own biggest asset by far.",
  "Rule No. 1: Never lose money. Rule No. 2: Never forget Rule No. 1.",
  "Compound interest is the eighth wonder of the world. He who understands it, earns it. He who doesn't, pays it.",
  "Wealth is not about having a lot of money; it's about having a lot of options.",
  "I will tell you the secret to getting rich on Wall Street. You try to be greedy when others are fearful. And you try to be fearful when others are greedy.",
  "How many millionaires do you know who have become wealthy by investing in savings accounts?",
  "If you want to reap financial blessings, you have to sow financially.",
  "It's good to have money and the things that money can buy, but it's good, too, to check up once in a while and make sure that you haven't lost the things that money can't buy.",
  "The stock market is a device for transferring money from the impatient to the patient.",
  "Price is what you pay. Value is what you get.",
  "Money is usually attracted, not pursued.",
  "Financial freedom is available to those who learn about it and work for it.",
  "I'd like to live as a poor man with lots of money.",
  "Happiness is not in the mere possession of money; it lies in the joy of achievement, in the thrill of creative effort.",
  "You can be young without money, but you can't be old without it.",
  "Not everything that can be counted counts, and not everything that counts can be counted.",
  "Empty pockets never held anyone back. Only empty heads and empty hearts can do that.",
  "Before you speak, listen. Before you spend, earn. Before you criticize, wait. Before you quit, try.",
  "The only difference between a rich person and a poor person is how they use their time.",
  "People who cannot control their spending are slaves to their possessions.",
  "Saving money is the best thing. Especially when your parents did it for you.",
  "Expect the best. Prepare for the worst. Capitalize on what comes.",
  "If we command our wealth, we shall be rich and free. If our wealth commands us, we are poor indeed.",
  "Make money your servant, not your master.",
  "What you do today can improve all your tomorrows.",
  "The best investment you can make is in yourself.",
  "Don't let the fear of losing be greater than the excitement of winning.",
  "It's how you deal with failure that determines how you achieve success.",
  "Success is walking from failure to failure with no loss of enthusiasm.",
  "A journey of a thousand miles begins with a single step.",
  "Wealth after all is a relative thing since he that has little and wants less is richer than he that has much and wants more.",
  "Money is multiplied in practical value depending on the number of W's you control in your life: what you do, when you do it, where you do it, and with whom you do it.",
  "Being rich is having money; being wealthy is having time.",
  "Do what you love and the money will follow.",
  "Stop buying things you don't need to impress people you don't even like.",
  "Budgeting is not just for people who do not have enough money. It is for everyone who wants to ensure that their money is enough.",
  "The more your money works for you, the less you have to work for money.",
  "Financial security and independence are like a three-legged stool resting on savings, insurance, and investments."
]

export default class extends Controller {
  static targets = ["text", "toggle"]

  connect() {
    this.showQuotes = localStorage.getItem("showQuotes") !== "false"
    this._applyVisibility()
    if (this.showQuotes) this._showNext()
  }

  toggle() {
    this.showQuotes = !this.showQuotes
    localStorage.setItem("showQuotes", String(this.showQuotes))
    this._applyVisibility()
    if (this.showQuotes) this._showNext()
  }

  _showNext() {
    let idx = parseInt(localStorage.getItem("quoteIndex") || "0", 10)
    if (isNaN(idx) || idx < 0 || idx >= QUOTES.length) idx = 0
    this.textTarget.textContent = `"${QUOTES[idx]}"`
    localStorage.setItem("quoteIndex", String((idx + 1) % QUOTES.length))
  }

  _applyVisibility() {
    if (this.showQuotes) {
      this.textTarget.classList.remove("hidden")
      this.toggleTarget.title = "Hide quotes"
      this.toggleTarget.innerHTML = `<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"/></svg>`
    } else {
      this.textTarget.classList.add("hidden")
      this.toggleTarget.title = "Show quotes"
      this.toggleTarget.innerHTML = `<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>`
    }
  }
}
