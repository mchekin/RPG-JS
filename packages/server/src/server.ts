import { ServerEngine } from 'lance-gg';
import { SceneMap } from './Scenes/Map';
import { SceneBattle } from './Scenes/Battle';
import { RpgPlayer } from './Player/Player'
import { Query } from './Query'
import Monitor from './Monitor'
import { DAMAGE_SKILL, DAMAGE_PHYSIC, DAMAGE_CRITICAL, COEFFICIENT_ELEMENTS } from './presets'
import { World } from '@rpgjs/sync-server'
import { Utils } from '@rpgjs/common'

export default class RpgServerEngine extends ServerEngine {

    public database: any = {}
    public damageFormulas: any = {}
    private playerClass: any
    private scenes: Map<string, any> = new Map()
    protected totalConnected: number = 0

    constructor(public io, public gameEngine, private inputOptions) {
        super(io, gameEngine, World, inputOptions) 
        this.playerClass = inputOptions.playerClass || RpgPlayer
        if (inputOptions.database) {
            for (let key in inputOptions.database) {
                const data = inputOptions.database[key]
                this.database[data.id] = data
            }
        }
        this.damageFormulas = inputOptions.damageFormulas || {}
        this.damageFormulas = {
            damageSkill: DAMAGE_SKILL,
            damagePhysic: DAMAGE_PHYSIC,
            damageCritical: DAMAGE_CRITICAL,
            coefficientElements: COEFFICIENT_ELEMENTS,
            ...this.damageFormulas
        }
        this.loadScenes()
    }

     /**
     * Start the RPG server
     * 
     * @method server.start()
     * @returns {void}
     * @memberof RpgServerEngine
     */
    start() {
        super.start()
    }

    step() {
        super.step()
        if (!Utils.isBrowser()) Monitor.update(this)
    }

    loadScenes() {
        this.scenes[SceneMap.id] =  new SceneMap(this.inputOptions.maps, this)
        this.scenes[SceneBattle.id] =  new SceneBattle(this)
    }

    getScene(name) {
        return this.scenes[name]
    }

    sendToPlayer(currentPlayer, eventName, data) {
        currentPlayer._socket.emit(eventName, data)
    }

    onPlayerConnected(socket) {
        const playerId = super.onPlayerConnected(socket)
        let player = new this.playerClass(this.gameEngine, { id: playerId }, { playerId })
        
        World.setUser(player, socket)

        this.gameEngine.addPlayer(player, socket.playerId, true)

        if (!Utils.isBrowser()) Monitor.addMonitor(socket)
        player.server = this
        player._init()
        player.execMethod('onConnected')
    }

    onPlayerDisconnected(socketId, playerId) { 
        super.onPlayerDisconnected(socketId, playerId)
        const player = this.gameEngine.world.getObject(playerId)
        if (!Utils.isBrowser()) Monitor.removeMonitor(socketId)
        player.execMethod('onDisconnected')
        this.gameEngine.removeObjectFromWorld(player.id)
    }
}