<template>
  <div>
    <div
      v-show="!connected"
      class="connecting"
    >
      <b-spinner variant="info" label="Spinning"></b-spinner>
    </div>

    <div
      class="selection-box"
      v-show="stocksDataList.length"
    >
      <span>Ativos:</span>
      <span
        v-for="stock in stocksDataList"
        :key="stock.symbol"
        class="stock"
        @click="toggleSelectStock(stock.symbol)"
      ><b-badge :variant="stockBadgeVariant(stock.symbol)">{{stock.symbol}}</b-badge></span>
    </div>

    <!-- Listagem de ações -->
    <div class="stocks-list-box">
      <b-card-group
        columns
      >
        <b-card
          bg-variant="dark"
          text-variant="white"
          :header="stock.symbol"
          class="text-center"
          v-for="stock in stocksDataList"
          :key="stock.symbol"
          v-show="isStockSelected(stock.symbol)"
        >
          <template #header>
            <div class="stock-header">
              <div class="name">{{stock.companyName}}</div>
              <div class="badge-box">
                <b-badge variant="light">{{stock.symbol}}</b-badge>
              </div>
            </div>
          </template>
          <b-card-text>
            <span>R${{stock.basePrice.toFixed(2)}}</span>
          </b-card-text>
        </b-card>
      </b-card-group>
    </div>
  </div>
</template>

<style lang="scss">
.selection-box {
  margin-top: 10px;
  margin-bottom: 10px;
}
.selection-box .stock {
  margin-left: 5px;
  margin-right: 5px;
  cursor: pointer;
}
.stocks-list-box {
  width: 80%;
  margin-left: 10%;
  margin-right: 10%;
}
.stock-header .name {
  display: inline-block;
  overflow: hidden;
  max-height: 2em;
  width: 75%;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
  padding-right: 5px;
}
.stock-header .badge-box {
  display: inline-block;
  overflow: hidden;
  width: 20%;
}
.connecting {
  position: absolute;
  top: 50%;
  left: 50%;
}
</style>

<script>

export default {
  name: 'Home',
  components: {
  },
  data() {
    return {
      'stocksDataList': [],
      'stocksData': [],
      'supportedSymbols': [],
      'observedStocks': [],
      'selectedStocks': [],
      'isFirstConnection': true,
      'connected': false,
      //Define se deve ser feito subscribe quando uma mensagem de conectado
      //é recebida.
      'autoSubscribe': true,
      'listUpdateInterval': null
    }
  },
  mounted() {
    console.log("mounted", this);
    //Para agilizar o encerramento da conexão ao recarregar o componente
    //durante o desenvolvimento.
    this.$socket.close();
    this.startListenToMessages();
    this.showListInterval();
  },
  beforeDestroy() {
    if (this.listUpdateInterval){
      clearInterval(this.listUpdateInterval);
      this.listUpdateInterval = null;
    }
  },
  watch: {
  },
  methods: {
    showListInterval() {
      this.listUpdateInterval = setInterval(
        ()=>{
          this.stocksDataList = this._.cloneDeep(this.stocksData);
        },
        100
      )
    },
    toggleSelectStock(symbol) {
      var selectedStockscopy = this._.cloneDeep(this.selectedStocks);
      if ( this.isStockSelected(symbol) ) {
        selectedStockscopy.splice(this.selectedStocks.indexOf(symbol),1);
      } else {
        selectedStockscopy.push(symbol);
      }
      this.selectedStocks = selectedStockscopy;
    },
    isStockSelected(symbol) {
      return this.selectedStocks.includes(symbol);
    },
    stockBadgeVariant(symbol) {
      return this.isStockSelected(symbol)?'info':'secondary';
    },
    //Retorna uma ação
    getStock(symbol) {
      return this.stocksData.find(
        function(stock){ return stock.symbol == symbol }
      );
    },
    //Recebe uma message do tipo stocks-update e atualiza as stocks com os novos dados.
    updateStock( parsed ) {

      //Para cada symbol atualizado.
      Object.keys(parsed.stocks).every((eventSymbol)=>{
        //Encontra a stock que foi atualizada.
        var stock = this.getStock( eventSymbol );
        if ( stock ) {
          stock.basePrice = parsed.stocks[eventSymbol];//
        }
      });
    },
    //Exibe uma message no console.
    logMessage( parsed ) {
      console.log('onMessage', parsed.event, parsed)
    },
    //Recebe uma message e através do event chama a callback adequada.
    onMessageCbs( data ) {
      var parsed = JSON.parse(data.data);
      var events = {
        "connected": () => {
          this.stocksData = parsed.stocksData;
          this.supportedSymbols = parsed.supportedSymbols;

          //Na primeira conexão serão observadas todas as ações.
          if ( this.isFirstConnection ) {
            this.observedStocks = this._.cloneDeep(this.supportedSymbols);
            this.selectedStocks = this._.cloneDeep(this.supportedSymbols);
          }

          this.logMessage(parsed);

          //Fará o subscribe somente se o usuário não
          //cancelou o subscribe.
          if (this.autoSubscribe) {
            this.subscribe(this.selectedStocks);
          }
          this.connected = true;
        },
        "stocks-update": () => {
          this.updateStock(parsed);
        },
        "disconnecting": () => {
          this.connected = false;
          this.isFirstConnection = false;
          this.logMessage(parsed);
        }
      }

      try {
        events[parsed.event](data);
      } catch (e) {
        console.warn('onMessageCbs', e);
        this.logMessage(parsed);
      }
    },
    //Define callback de onmessage.
    startListenToMessages() {
      this.$options.sockets.onmessage = (data) => {
        this.onMessageCbs(data);
      }
    },
    //Remove callback de onmessage.
    stopListenToMessages() {
      delete this.$options.sockets.onmessage
    },
    //Faz o subscribe para receber atualizações das stocks.
    subscribe(symbols) {
      this.autoSubscribe = true;
      var message = {
        "event": "subscribe",
        "stocks": symbols
      }
      this.$socket.sendObj(message)
    },
    //Para o subscribe que recebe atualizações das stocks.
    unsubscribe(symbols) {
      this.autoSubscribe = false;
      var message = {
        "event": "unsubscribe",
        "stocks": symbols
      }
      this.$socket.sendObj(message)
    }
  }
}
</script>
